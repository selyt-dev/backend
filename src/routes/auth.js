const { Route } = require("../");
const { Router } = require("express");

module.exports = class Auth extends Route {
  constructor(client) {
    super(
      {
        name: "auth",
      },
      client
    );

    this.client = client;
  }

  register(app) {
    const router = Router();

    router.get("/:provider", (req, res) => {
      const provider = this.client.oauthproviders.find(
        (p) => p.name === req.params.provider
      );

      if (!provider) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid OAuth provider." });
      }

      return res.redirect(provider.getToken());
    });

    router.get("/:provider/callback", async (req, res) => {
      const provider = this.client.oauthproviders.find(
        (p) => p.name === req.params.provider
      );

      if (!provider) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid OAuth provider." });
      }

      const code = req.query.code;
      const scope = req.query.scope;

      await provider
        .validateCode(code, scope)
        .then((d) => res.status(200).json(d.data))
        .catch((error) =>
          res.status(500).json({ ok: false, message: error.message })
        );
    });

    router.get("/:provider/@me", async (req, res) => {
      const provider = this.client.oauthproviders.find(
        (p) => p.name === req.params.provider
      );

      if (!provider) {
        return res
          .status(400)
          .json({ ok: false, message: "Invalid OAuth provider." });
      }

      const token = req.query.token;

      if (!token) {
        return res
          .status(401)
          .json({ ok: false, message: "Missing token parameter." });
      }

      await provider
        .getUserData(token)
        .then((d) => res.status(200).json(d))
        .catch((error) =>
          res.status(500).json({ ok: false, message: error.message })
        );
    });

    app.use(this.path, router);
  }
};
