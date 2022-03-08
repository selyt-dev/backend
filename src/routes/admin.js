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
        let { page, limit } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        const offset = limit * (page - 1);

        const requests =
          await this.client.database.models.SupportRequest.findAll({
            offset,
            limit,
            include: {
              model: this.client.database.models.User,
              required: true,
            },
          });

        const count = await this.client.database.models.SupportRequest.count();

        return res.status(200).json({ ok: true, requests, page, limit, count });
      }
    );

    app.use(this.path, router);
  }
};
