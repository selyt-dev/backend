/* eslint prefer-regex-literals: "off" */
const { Op } = require("sequelize");

const { Route } = require("../");
const { Router } = require("express");
const Joi = require("joi");

const crypto = require("crypto");

module.exports = class User extends Route {
  constructor(client) {
    super(
      {
        name: "user",
      },
      client
    );

    this.client = client;
  }

  register(app) {
    const router = Router();

    router.post(
      "/register",
      this.client.routeUtils.verifyRegister(this.client)
    );

    router.post("/login", this.client.routeUtils.verifyLogin(this.client));

    router.get(
      "/@me",
      this.client.routeUtils.validateLogin(this.client),
      async (_req, res) => {
        const { hash, salt, ...userObj } = res.locals.user;
        return res.status(200).json({ ok: true, user: userObj });
      }
    );

    router.get(
      "/@me/transactions",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          await this.client.database.models.Transaction.findAll({
            order: [["createdAt", "DESC"]],
            where: { userId: res.locals.user.id },
          })
            .then((transactions) => {
              return res.status(200).json({ ok: true, transactions });
            })
            .catch((err) => {
              return res
                .status(500)
                .json({ ok: false, message: err.toString() });
            });
        } catch (err) {
          return res.status(500).json({ ok: false, message: err.toString() });
        }
      }
    );

    router.post(
      "/@me/avatar",
      this.client.routeUtils.validateLogin(this.client),
      this.client.routeUtils.uploadAvatar(this.client),
      async (req, res) => {
        try {
          await this.client.database.models.User.update(
            { hasAvatar: true },
            { where: { id: res.locals.user.id } }
          );
          return res.status(200).json({ ok: true });
        } catch (error) {
          return res.status(500).json({ ok: false, message: error.toString() });
        }
      }
    );

    router.put(
      "/@me",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        const body = req.body;

        const schema = Joi.object({
          name: Joi.string().min(3).max(32).required(),
          email: Joi.string().email().required(),
          nif: Joi.number().integer().min(100000000).max(999999999).required(),
          phone: Joi.number()
            .integer()
            .min(100000000)
            .max(999999999)
            .required(),
          iban: Joi.string().pattern(new RegExp(/(PT50)([0-9]{21})/)),
        });

        try {
          const value = await schema.validateAsync(body);

          this.client.database.models.User.findOne({
            where: {
              [Op.or]: [
                { email: value.email },
                { nif: value.nif },
                { phone: value.phone },
                { iban: value.iban || "" },
              ],
              [Op.not]: { id: res.locals.user.id },
            },
          })
            .then((_user) => {
              if (_user) {
                return res.status(400).json({
                  ok: false,
                  message: "User data already exists in the platform.",
                });
              }

              this.client.database.models.User.update(
                {
                  name: value.name,
                  email: value.email,
                  nif: value.nif,
                  phone: value.phone,
                  iban: value.iban,
                },
                {
                  where: {
                    id: res.locals.user.id,
                  },
                }
              )
                .then(() => {
                  return res.status(200).json({ ok: true });
                })
                .catch((err) => {
                  return res
                    .status(500)
                    .json({ ok: false, message: err.toString() });
                });
            })
            .catch((err) => {
              return res
                .status(500)
                .json({ ok: false, message: err.toString() });
            });
        } catch (err) {
          return res.status(400).json({ ok: false, message: err.toString() });
        }
      }
    );

    router.put(
      "/@me/password",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        const body = req.body;

        const schema = Joi.object({
          password: Joi.string().min(8).max(32).required(),
          newPassword: Joi.string()
            .pattern(new RegExp("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$"))
            .required(),
          newPasswordConfirmation: Joi.ref("newPassword"),
        });

        try {
          const value = await schema.validateAsync(body);

          const hash = crypto
            .pbkdf2Sync(
              value.password,
              res.locals.user.salt,
              1000,
              64,
              "sha512"
            )
            .toString("hex");

          if (hash === res.locals.user.hash) {
            // Password is the same

            this.client.database.models.User.update(
              {
                hash: value.newPassword,
              },
              {
                where: {
                  id: res.locals.user.id,
                },
              }
            )
              .then(() => {
                return res.status(200).json({ ok: true });
              })
              .catch((err) => {
                return res
                  .status(500)
                  .json({ ok: false, message: err.toString() });
              });
          } else {
            return res
              .status(401)
              .json({ ok: false, message: "Invalid credentials." });
          }
        } catch (err) {
          return res.status(400).json({ ok: false, message: err.toString() });
        }
      }
    );

    app.use(this.path, router);
  }
};
