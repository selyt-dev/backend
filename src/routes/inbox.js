const { Op, fn, col } = require("sequelize");

const Joi = require("joi");
const crypto = require("crypto");

const { Route } = require("../");
const { Router } = require("express");
const Notifications = require("../utils/Notifications");

module.exports = class Inbox extends Route {
  constructor(client) {
    super(
      {
        name: "inbox",
      },
      client
    );

    this.client = client;
  }

  register(app) {
    const router = Router();

    router.get(
      "/chats",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const chats = await this.client.database.models.Inbox.findAll({
            where: {
              [Op.or]: [
                { senderId: res.locals.user.id },
                { receiverId: res.locals.user.id },
              ],
            },
            include: [
              {
                model: this.client.database.models.User,
                as: "sender",
                required: true,
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
              {
                model: this.client.database.models.User,
                as: "receiver",
                required: true,
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
              {
                model: this.client.database.models.Ad,
                as: "ad",
                required: true,
              },
            ],
          });

          return res.status(200).json({ ok: true, chats });
        } catch (error) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/:id",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const chat = await this.client.database.models.Inbox.findOne({
            where: {
              id: req.params.id,
            },
            include: [
              {
                model: this.client.database.models.User,
                as: "sender",
                required: true,
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
              {
                model: this.client.database.models.User,
                as: "receiver",
                required: true,
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
              {
                model: this.client.database.models.Ad,
                as: "ad",
                required: true,
              },
            ],
          });

          if (!chat) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          const messages = await this.client.database.models.Message.findAll({
            where: {
              inboxId: req.params.id,
            },
            include: [
              {
                model: this.client.database.models.User,
                required: true,
                as: "sender",
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
            ],
          });

          return res.status(200).json({ ok: true, chat, messages });
        } catch (error) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.post(
      "/create",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const { id } = res.locals.user;
          const { adId } = req.body;

          const ad = await this.client.database.models.Ad.findOne({
            where: {
              id: adId,
            },
            include: [
              {
                model: this.client.database.models.User,
                required: true,
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
            ],
          });

          const chat = await this.client.database.models.Inbox.findOrCreate({
            where: {
              senderId: id,
              receiverId: ad.User.id,
              adId,
            },
          });

          return res.status(200).json({ ok: true, chat: chat[0] });
        } catch (error) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.put(
      "/:id",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const { id } = res.locals.user;
          const { message } = req.body;

          const _message = await this.client.database.models.Message.create({
            senderId: id,
            message,
            inboxId: req.params.id,
          });

          const chat = await this.client.database.models.Inbox.update(
            {
              messages: fn("array_append", col("messages"), _message.id),
            },
            {
              where: {
                id: req.params.id,
              },
            },
            {
              include: [
                {
                  model: this.client.database.models.User,
                  required: true,
                  as: "receiver",
                  attributes: {
                    exclude: ["hash", "salt"],
                  },
                },
                {
                  model: this.client.database.models.User,
                  required: true,
                  as: "sender",
                  attributes: {
                    exclude: ["hash", "salt"],
                  },
                },
              ],
            }
          );

          const messageObj = await this.client.database.models.Message.findOne({
            where: {
              id: _message.id,
            },
            include: [
              {
                model: this.client.database.models.User,
                required: true,
                as: "sender",
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
            ],
          });

          await Notifications.sendNotification(
            "Recebeu uma nova mensagem!",
            `${chat[0].receiver.name} enviou uma nova mensagem!`,
            chat[0].receiver.devicePushToken
          );

          return res.status(200).json({ ok: true, chat, message: messageObj });
        } catch (error) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.put(
      "/:id/upload",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        const body = req.body;

        const schema = Joi.object({
          image: Joi.string().required(),
        });

        try {
          const { value } = await schema.validate(body);

          const { id } = res.locals.user;

          const chat = await this.client.database.models.Inbox.findOne({
            where: {
              id: req.params.id,
            },
          });

          const _image = {
            id: crypto.randomBytes(16).toString("hex"),
            image: value.image,
          };

          console.log(_image.id);

          await this.client.routeUtils.uploadInboxImage(
            this.client,
            chat.id,
            _image
          );

          await this.client.database.models.Message.create({
            senderId: id,
            message: `{${_image.id}.jpg}`,
            inboxId: chat.id,
          });

          this.client.io.to(chat.id).emit("message", {
            message: "Nova imagem enviada!",
            senderId: id,
          });

          return res.status(200).json({ ok: true });
        } catch (error) {
          console.log(error);
          return res.status(500).json({ ok: false, message: error.toString() });
        }
      }
    );

    app.use(this.path, router);
  }
};
