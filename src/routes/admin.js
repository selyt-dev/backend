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

    app.use(this.path, router);
  }

  lowerCaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
  }
};
