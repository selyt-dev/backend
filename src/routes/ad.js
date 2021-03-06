/* eslint prefer-regex-literals: "off" */
const { Op, where, fn, col } = require("sequelize");

const { Route } = require("..");
const { Router } = require("express");
const Joi = require("joi");

const crypto = require("crypto");

module.exports = class Ad extends Route {
  constructor(client) {
    super(
      {
        name: "ad",
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
        try {
          const ads = await this.client.database.models.Ad.findAll({
            where: {
              isActive: true,
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
                model: this.client.database.models.Category,
                required: true,
              },
            ],
          });

          return res.status(200).json({ ok: true, ads });
        } catch (error) {
          console.log(error);
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/:id/data",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const ad = await this.client.database.models.Ad.findOne({
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
                model: this.client.database.models.Category,
                required: true,
              },
            ],
          });

          if (!ad) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          return res.status(200).json({ ok: true, ad });
        } catch (error) {
          console.log(error);
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/multiple",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        const { ads } = req.query;

        if (!ads) {
          return res
            .status(400)
            .json({ ok: false, message: "Ads not provided" });
        }

        const adsIds = ads.split(",");

        try {
          const ads = await this.client.database.models.Ad.findAll({
            where: {
              id: {
                [Op.or]: adsIds,
              },
              isActive: true,
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
                model: this.client.database.models.Category,
                required: true,
              },
            ],
          });

          return res.status(200).json({ ok: true, ads });
        } catch (error) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/@me",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const ads = await this.client.database.models.Ad.findAll({
            where: {
              userId: res.locals.user.id,
            },
          });

          if (!ads) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          return res.status(200).json({ ok: true, ads });
        } catch (err) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.put(
      "/:id/view",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const ad = await this.client.database.models.Ad.findOne({
            where: {
              id: req.params.id,
            },
          });

          if (!ad) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          await ad.increment("visits");

          return res.status(200).json({ ok: true });
        } catch (err) {
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
        const body = req.body;

        console.log(body);

        const schema = Joi.object({
          title: Joi.string().min(5).max(70).required(),
          description: Joi.string().min(10).max(2000).required(),
          price: Joi.number().min(0).required(),
          isNegotiable: Joi.boolean().required(),
          categoryId: Joi.string().required(),
          region: Joi.string().required(),
          images: Joi.array(),
          // tags: Joi.array().items(Joi.string()),
        });

        try {
          const value = await schema.validateAsync(body);

          const { images, ...rest } = value;

          let _ad = await this.client.database.models.Ad.create({
            ...rest,
            userId: res.locals.user.id,
          });

          if (value.images.length > 0) {
            // Generate UUID for images
            const images = value.images.map((image) => {
              return {
                id: crypto.randomBytes(16).toString("hex"),
                image,
              };
            });

            images.forEach(async (image) => {
              await this.client.routeUtils.uploadAdImage(
                this.client,
                _ad.id,
                image
              );
            });

            await _ad.update(
              {
                images: images.map((image) => image.id),
              },
              {
                where: {
                  id: _ad.id,
                },
              }
            );
          }

          const ad = await this.client.database.models.Ad.findOne({
            where: {
              id: _ad.id,
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
                model: this.client.database.models.Category,
                required: true,
              },
            ],
          });

          return res.status(200).json({ ok: true, ad });
        } catch (err) {
          console.log(err);
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/search-by-category",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        const { category } = req.query;

        try {
          const ads = await this.client.database.models.Ad.findAll({
            where: {
              categoryId: category,
              isActive: true,
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

          return res.status(200).json({ ok: true, ads });
        } catch (err) {
          console.log(err);
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.get(
      "/search",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        const { query } = req.query;

        if (!query) {
          return res
            .status(400)
            .json({ ok: false, message: "Query not provided" });
        }

        try {
          const ads = await this.client.database.models.Ad.findAll({
            where: {
              title: where(
                fn("LOWER", col("title")),
                "LIKE",
                "%" + query.toLowerCase() + "%"
              ),
              isActive: true,
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
                model: this.client.database.models.Category,
                required: true,
              },
            ],
          });

          if (ads.length === 0) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          return res.status(200).json({ ok: true, ads });
        } catch (err) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    router.put(
      "/:id/edit",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const schema = Joi.object({
            title: Joi.string().min(5).max(70).required(),
            description: Joi.string().min(10).max(2000).required(),
            price: Joi.number().min(0).required(),
            isNegotiable: Joi.boolean().required(),
            isActive: Joi.boolean().required(),
            categoryId: Joi.string().required(),
            region: Joi.string().required(),
            images: Joi.array(),
            // tags: Joi.array().items(Joi.string()),
          });

          const value = await schema.validateAsync(req.body);

          const { images, ...rest } = value;

          const ad = await this.client.database.models.Ad.findOne({
            where: {
              id: req.params.id,
            },
          });

          if (!ad) {
            return res
              .status(404)
              .json({ ok: false, message: this.client.errors.NOT_FOUND });
          }

          if (ad.userId !== res.locals.user.id) {
            return res
              .status(403)
              .json({ ok: false, message: this.client.errors.FORBIDDEN });
          }

          await ad.update({
            ...rest,
          });

          if (images.length > 0) {
            // Generate UUID for images
            const images = value.images.map((image) => {
              return {
                id: crypto.randomBytes(16).toString("hex"),
                image,
              };
            });

            images.forEach(async (image) => {
              await this.client.routeUtils.uploadAdImage(
                this.client,
                ad.id,
                image
              );

              await ad.update(
                {
                  images: fn("array_append", col("images"), image.id),
                },
                {
                  where: {
                    id: ad.id,
                  },
                }
              );
            });
          }

          const adUpdated = await this.client.database.models.Ad.findOne({
            where: {
              id: ad.id,
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
                model: this.client.database.models.Category,
                required: true,
              },
            ],
          });

          return res.status(200).json({ ok: true, ad: adUpdated });
        } catch (err) {
          return res
            .status(500)
            .json({ ok: false, message: this.client.errors.SERVER_ERROR });
        }
      }
    );

    app.use(this.path, router);
  }
};
