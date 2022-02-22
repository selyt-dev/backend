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

    router.get("/", async (req, res) => {
      try {
        const categories = await this.client.database.models.Category.findAll();

        return res.status(200).json({ ok: true, categories });
      } catch (error) {
        return res.status(500).json({ ok: false, message: error.toString() });
      }
    });

    app.use(this.path, router);
  }
};
