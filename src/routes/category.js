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
        let { page, limit } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;

        const offset = limit * (page - 1);

        const categories = await this.client.database.models.Category.findAll({
          offset,
          limit,
        });

        const count = await this.client.database.models.Category.count();

        return res
          .status(200)
          .json({ ok: true, categories, page, limit, count });
      }
    );

    app.use(this.path, router);
  }
};
