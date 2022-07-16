const { Route } = require("../");
const { Router } = require("express");

module.exports = class Category extends Route {
  constructor(client) {
    super(
      {
        name: "category",
      },
      client
    );

    this.client = client;
  }

  register(app) {
    const router = Router();

    router.get(
      "/",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        let { page, limit, orderBy } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        orderBy = orderBy ? orderBy.split(" ") : ["name", "ASC"];
        orderBy[0] = this.lowerCaseFirstLetter(orderBy[0]);
        orderBy[1] = orderBy[1] || "ASC";

        const offset = limit * (page - 1);

        const categories = await this.client.database.models.Category.findAll({
          order: [orderBy],
          offset,
          limit,
          where: { isActive: true },
        });

        const count = await this.client.database.models.Category.count();

        return res
          .status(200)
          .json({ ok: true, categories, page, limit, count });
      }
    );

    router.get(
      "/include-non-active",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        let { page, limit, orderBy } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        orderBy = orderBy ? orderBy.split(" ") : ["name", "ASC"];
        orderBy[0] = this.lowerCaseFirstLetter(orderBy[0]);
        orderBy[1] = orderBy[1] || "ASC";

        const offset = limit * (page - 1);

        const categories = await this.client.database.models.Category.findAll({
          order: [orderBy],
          offset,
          limit,
        });

        const count = await this.client.database.models.Category.count();

        return res
          .status(200)
          .json({ ok: true, categories, page, limit, count });
      }
    );

    router.post(
      "/",
      this.client.routeUtils.validateLoginAdmin(this.client),
      async (req, res) => {
        const { name, denomination, icon } = req.body;

        const category = await this.client.database.models.Category.create({
          name,
          denomination,
          icon,
        });

        return res.status(200).json({ ok: true, category });
      }
    );

    app.use(this.path, router);
  }

  lowerCaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
  }
};
