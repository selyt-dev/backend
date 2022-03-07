const { Op } = require("sequelize");

const { Route } = require("../");
const { Router } = require("express");

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
                required: true,
              },
            ],
          });

          return res.status(200).json({ ok: true, chats });
        } catch (error) {
          console.log(error);
          return res.status(500).json({ ok: false, message: error.toString() });
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
                required: true,
                attributes: {
                  exclude: ["hash", "salt", "devicePushToken"],
                },
              },
              {
                model: this.client.database.models.Ad,
                required: true,
              },
            ],
          });

          if (!chat) {
            return res
              .status(404)
              .json({ ok: false, message: "Chat not found." });
          }

          return res.status(200).json({ ok: true, chat });
        } catch (error) {
          return res.status(500).json({ ok: false, message: error.toString() });
        }
      }
    );

    router.post(
      "/create",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const { id } = res.locals.user;
          const { receiverId, adId } = req.body;

          const chat = await this.client.database.models.Inbox.create({
            senderId: id,
            receiverId,
            adId,
          });

          return res.status(200).json({ ok: true, chat });
        } catch (error) {
          return res.status(500).json({ ok: false, message: error.toString() });
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
          });

          const chat = await this.client.database.models.Inbox.update(
            {
              messages: _message.id,
            },
            {
              where: {
                id: req.params.id,
              },
            }
          );

          return res.status(200).json({ ok: true, chat });
        } catch (error) {
          return res.status(500).json({ ok: false, message: error.toString() });
        }
      }
    );

    /**
     * - fazer categorias
     * - fazer anúncios
     * - fazer +1 user
     * - testar mensagens
     */

    app.use(this.path, router);
  }
};
