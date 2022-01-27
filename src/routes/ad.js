/* eslint prefer-regex-literals: "off" */
const { Op } = require("sequelize");

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
      this.client.routeUTils.validateLogin(this.client),
      async (req, res) => {
        try {
          const ads = await this.client.database.Ad.findAll({
            where: {
              isActive: true,
            },
          });

          return res.status(200).json({ ok: true, ads });
        } catch (error) {
          return res.status(500).json({ ok: false, message: error.toString() });
        }
      }
    );

    router.get(
      "/@me",
      this.client.routeUtils.validateLogin(this.client),
      async (req, res) => {
        try {
          const ads = await this.client.models.Ad.findAll({
            where: {
              userId: res.locals.user.id,
            },
          });

          return res.status(200).json({ ok: true, ads });
        } catch (err) {
          return res.status(500).json({ ok: false, message: err.toString() });
        }
      }
    );

    router.post(
      "/:id/images",
      this.client.routeUtils.validateLogin(this.client),
      this.client.routeUtils.validateAd(this.client),
      async (req, res) => {
        const { id } = req.params;
        const { ad } = res.locals;
        const { images } = req.body;

        const s3 = this.client.S3;

        try {
          await images.forEach(async (image, i) => {
            const buf = Buffer.from(
              image.replace(/^data:image\/\w+;base64,/, ""),
              "base64"
            );

            const params = {
              Bucket: process.env.AWS_BUCKET,
              Key: `ads/${req.params.id}/${ad.images[i]}.jpg`,
              ContentEncoding: "base64",
              ContentType: "image/jpeg",
              Body: buf,
            };

            s3.upload(params, (err, data) => {
              if (err) {
                console.log(err);
                return res
                  .status(500)
                  .json({ ok: false, message: err.toString() });
              }

              console.log(data);
            });
          });

          return res.status(200).json({ ok: true, ad });
        } catch (err) {
          return res.status(500).json({ ok: false, message: err.toString() });
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
          images: Joi.array().items(Joi.string()),
          // tags: Joi.array().items(Joi.string()),
        });

        try {
          const value = await schema.validateAsync(body);

          if (value.images.length > 0) {
            // Generate UUID for images
            const images = value.images.map((image) => {
              return {
                id: crypto.randomBytes(16).toString("hex"),
                image,
              };
            });

            value.images = images;

            console.log(value);
          }

          // TODO: Make this work

          const ad = await this.client.database.models.Ad.create({
            ...value,
            userId: res.locals.user.id,
          });

          return res.status(200).json({ ok: true, ad });
        } catch (err) {
          console.log(err);
          return res.status(500).json({ ok: false, message: err.toString() });
        }
      }
    );

    app.use(this.path, router);
  }
};
