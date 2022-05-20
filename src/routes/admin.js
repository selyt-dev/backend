/* eslint prefer-regex-literals: "off" */
const { Op } = require("sequelize");

const { Route } = require("../");
const { Router } = require("express");
const Joi = require("joi");

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

module.exports = class Admin extends Route {
  constructor(client) {
    super(
      {
        name: "admin",
      },
      client
    );

    this.client = client;
  }

  register(app) {
    const router = Router();

    router.get(
      "/support-request/:id",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        const id = req.params.id;

        const supportRequest =
          await this.client.database.models.SupportRequest.findOne({
            where: { id },
            include: {
              model: this.client.database.models.User,
              required: true,
            },
          });

        if (!supportRequest) {
          return res
            .status(404)
            .json({ ok: false, message: this.client.errors.NOT_FOUND });
        }

        return res.status(200).json({ ok: true, request: supportRequest });
      }
    );

    router.get(
      "/support-requests",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        let { page, limit, orderBy } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        orderBy = orderBy ? orderBy.split(" ") : ["createdAt", "DESC"];
        orderBy[0] = this.lowerCaseFirstLetter(orderBy[0]);
        orderBy[1] = orderBy[1] || "ASC";

        const offset = limit * (page - 1);

        const requests =
          await this.client.database.models.SupportRequest.findAll({
            offset,
            limit,
            order: [orderBy],
            include: {
              model: this.client.database.models.User,
              required: true,
            },
          });

        if (!requests) {
          return res
            .status(404)
            .json({ ok: false, message: this.client.errors.NOT_FOUND });
        }

        const count = await this.client.database.models.SupportRequest.count();

        return res.status(200).json({ ok: true, requests, page, limit, count });
      }
    );

    router.post(
      "/support-request/update-status",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        const { supportRequestId, status } = req.body;

        try {
          const supportRequest =
            await this.client.database.models.SupportRequest.findOne({
              where: { id: supportRequestId },
            });

          if (!supportRequest) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          await supportRequest.update({
            status,
          });

          return res.status(200).json({ ok: true });
        } catch (error) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.post(
      "/support-request",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        const { message, supportRequestId } = req.body;
        const { name } = res.locals.user;

        try {
          const supportRequest =
            await this.client.database.models.SupportRequest.findOne({
              where: {
                id: supportRequestId,
              },
              include: {
                model: this.client.database.models.User,
                required: true,
              },
            });

          if (!supportRequest) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          this.client.mailer.sendMail({
            from: `"Selyt" <${process.env.EMAIL_USER}>`,
            to: supportRequest.User.email,
            subject: `Resposta ao seu pedido de suporte - ${supportRequest.subject}`,
            html: `<h1>Olá ${supportRequest.User.name},</h1>
          <br>
          <h3>${name} respondeu ao seu pedido de suporte:</h3>
          <p>${message}</p>
          <br>
          <p>Caso o seu problema não tenha sido resolvido, entre em contato connosco.</p>
          <p>Agradecemos a sua colaboração.</p>
          <br>
          <p>Selyt</p>`,
          });

          return res.status(200).json({ ok: true });
        } catch (error) {
          console.log(error);

          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/ads",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        let { page, limit, query, orderBy, categoryId } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        query = query || "";

        orderBy = orderBy ? orderBy.split(" ") : ["createdAt", "DESC"];
        orderBy[0] = this.lowerCaseFirstLetter(orderBy[0]);
        orderBy[1] = orderBy[1] || "ASC";

        categoryId = categoryId || "";

        const offset = limit * (page - 1);

        try {
          if (categoryId) {
            const ads = await this.client.database.models.Ad.findAll({
              where: {
                [Op.and]: [
                  {
                    title: {
                      [Op.iLike]: `%${query}%`,
                    },
                  },
                  {
                    categoryId: categoryId,
                  },
                ],
              },
              offset,
              limit,
              order: [orderBy],
              include: [
                {
                  model: this.client.database.models.User,
                  required: true,
                  attributes: {
                    exclude: ["hash", "salt", "devicePushToken"],
                  },
                },
                {
                  model: this.client.database.models.Category,
                  required: true,
                },
              ],
            });

            if (!ads) {
              return res
                .status(404)
                .json({ ok: false, message: this.client.errors.NOT_FOUND });
            }

            const count = await this.client.database.models.Ad.count();

            return res.status(200).json({ ok: true, ads, page, limit, count });
          } else {
            const ads = await this.client.database.models.Ad.findAll({
              where: {
                [Op.and]: [
                  {
                    title: {
                      [Op.iLike]: `%${query}%`,
                    },
                  },
                ],
              },
              offset,
              limit,
              order: [orderBy],
              include: [
                {
                  model: this.client.database.models.User,
                  required: true,
                  attributes: {
                    exclude: ["hash", "salt", "devicePushToken"],
                  },
                },
                {
                  model: this.client.database.models.Category,
                  required: true,
                },
              ],
            });

            if (!ads) {
              return res
                .status(404)
                .json({ ok: false, message: this.client.errors.NOT_FOUND });
            }

            const count = await this.client.database.models.Ad.count();

            return res.status(200).json({ ok: true, ads, page, limit, count });
          }
        } catch (err) {
          console.log(err);

          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/users",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        let { page, limit, query, orderBy } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        query = query || "";

        orderBy = orderBy ? orderBy.split(" ") : ["createdAt", "DESC"];
        orderBy[0] = this.lowerCaseFirstLetter(orderBy[0]);
        orderBy[1] = orderBy[1] || "ASC";

        const offset = limit * (page - 1);

        try {
          const users = await this.client.database.models.User.findAll({
            where: {
              [Op.and]: [
                {
                  name: {
                    [Op.iLike]: `%${query}%`,
                  },
                },
              ],
            },
            offset,
            limit,
            order: [orderBy],
            attributes: {
              exclude: ["hash", "salt", "devicePushToken"],
            },
          });

          if (!users) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          const count = await this.client.database.models.User.count();

          return res.status(200).json({ ok: true, users, page, limit, count });
        } catch (err) {
          console.log(err);

          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/user/:id",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        const { id } = req.params;

        try {
          const user = await this.client.database.models.User.findOne({
            where: { id },
            attributes: {
              exclude: ["hash", "salt", "devicePushToken"],
            },
          });

          if (!user) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          return res.status(200).json({ ok: true, user });
        } catch (err) {
          console.log(err);

          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    app.use(this.path, router);
  }

  lowerCaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
  }
};
