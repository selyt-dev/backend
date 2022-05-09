/* eslint prefer-regex-literals: "off" */
const { Op } = require("sequelize");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const Joi = require("joi");

module.exports = class RouteUtils {
  // Verify registration
  verifyRegister(client) {
    return async function (req, res) {
      const body = req.body;

      const schema = Joi.object({
        name: Joi.string().min(3).max(32).required(),
        email: Joi.string().email().required(),
        password: Joi.string()
          .pattern(new RegExp("^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$"))
          .required(),
        passwordConfirmation: Joi.ref("password"),
        birthDate: Joi.date().required(),
        nif: Joi.number().integer().min(100000000).max(999999999).required(),
        phone: Joi.number().integer().min(100000000).max(999999999).required(),
      });

      try {
        const value = await schema.validateAsync(body);

        client.database.models.User.findOrCreate({
          where: {
            [Op.or]: [
              { email: value.email },
              { nif: value.nif },
              { phone: value.phone },
            ],
          },
          defaults: {
            name: value.name,
            hash: value.password,
            birthDate: value.birthDate,
            email: value.email,
            nif: value.nif,
            phone: value.phone,
          },
        })
          .then(([user, created]) => {
            if (created)
              return res.status(200).json({ ok: true, uid: user.id });
            else {
              return res.status(403).json({
                ok: false,
                message: "User already exists in platform.",
              });
            }
          })
          .catch((err) => {
            console.log(err);
            return res.status(500).json({ ok: false, message: err.toString() });
          });
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() });
      }
    };
  }

  // Verify login
  verifyLogin(client) {
    return async function (req, res) {
      const body = req.body;

      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      });

      try {
        const value = await schema.validateAsync(body);

        client.database.models.User.findOne({
          where: { email: value.email },
        })
          .then((user) => {
            const hash = crypto
              .pbkdf2Sync(value.password, user.salt, 1000, 64, "sha512")
              .toString("hex");

            if (hash === user.hash) {
              const authorization = jwt.sign(
                `${user.email}:${value.password}`,
                process.env.JWT_SECRET
              );

              return res
                .status(200)
                .json({ ok: true, authorization: `Basic ${authorization}` });
            } else {
              return res
                .status(401)
                .json({ ok: false, message: "Invalid credentials." });
            }
          })
          .catch(() => {
            return res
              .status(401)
              .json({ ok: false, message: "Invalid credentials." });
          });
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() });
      }
    };
  }

  verifyLoginAdmin(client) {
    return async function (req, res) {
      const body = req.body;

      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().required(),
      });

      try {
        const value = await schema.validateAsync(body);

        client.database.models.User.findOne({
          where: { email: value.email, role: "admin" },
        })
          .then((user) => {
            const hash = crypto
              .pbkdf2Sync(value.password, user.salt, 1000, 64, "sha512")
              .toString("hex");

            if (hash === user.hash) {
              const authorization = jwt.sign(
                `${user.email}:${value.password}`,
                process.env.JWT_SECRET
              );

              return res
                .status(200)
                .json({ ok: true, authorization: `Basic ${authorization}` });
            } else {
              return res.status(401).json({
                ok: false,
                message: "Invalid credentials or insufficient permissions.",
              });
            }
          })
          .catch(() => {
            return res.status(401).json({
              ok: false,
              message: "Invalid credentials or insufficient permissions.",
            });
          });
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() });
      }
    };
  }

  // Validate ad
  validateAd(client) {
    return async function (req, res, next) {
      const { id } = req.params;

      try {
        const ad = await client.database.models.Ad.findOne({
          where: { id },
        });

        res.locals.ad = ad;
        next();
      } catch (err) {
        return res.status(404).json({ ok: false, message: "Ad not found." });
      }
    };
  }

  // Validate login data internally
  _validateLogin(token, client) {
    return new Promise(async (resolve, reject) => {
      token = token.replace("Basic ", "");

      let authData = await jwt.verify(token, process.env.JWT_SECRET);

      authData = authData.split(":");

      client.database.models.User.findOne({
        where: { email: authData[0] },
      })
        .then((user) => {
          const hash = crypto
            .pbkdf2Sync(authData[1], user.salt, 1000, 64, "sha512")
            .toString("hex");

          if (hash === user.hash) {
            resolve(user.dataValues);
          } else {
            reject(null);
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }

  // Validate login data
  validateLogin(client) {
    return async function (req, res, next) {
      let authHeader = req.headers.authorization;

      if (!req.headers.authorization || !authHeader.startsWith("Basic ")) {
        return res
          .status(401)
          .json({ ok: false, message: "User isn't authenticated." });
      }

      try {
        authHeader = authHeader.replace("Basic ", "");

        let authData = await jwt.verify(authHeader, process.env.JWT_SECRET);

        authData = authData.split(":");

        client.database.models.User.findOne({
          where: { email: authData[0] },
        })
          .then((user) => {
            const hash = crypto
              .pbkdf2Sync(authData[1], user.salt, 1000, 64, "sha512")
              .toString("hex");

            if (hash === user.hash) {
              res.locals.user = user.dataValues;
              return next();
            } else {
              return res
                .status(401)
                .json({ ok: false, message: "Invalid credentials." });
            }
          })
          .catch(() => {
            return res
              .status(401)
              .json({ ok: false, message: "Invalid credentials." });
          });
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() });
      }
    };
  }

  // Validate login admin
  validateLoginAdmin(client) {
    return async function (req, res, next) {
      let authHeader = req.headers.authorization;

      if (!req.headers.authorization || !authHeader.startsWith("Basic ")) {
        return res
          .status(401)
          .json({ ok: false, message: "User isn't authenticated." });
      }

      try {
        authHeader = authHeader.replace("Basic ", "");

        let authData = await jwt.verify(authHeader, process.env.JWT_SECRET);

        authData = authData.split(":");

        client.database.models.User.findOne({
          where: { email: authData[0], role: "admin" },
        })
          .then((user) => {
            const hash = crypto
              .pbkdf2Sync(authData[1], user.salt, 1000, 64, "sha512")
              .toString("hex");

            if (hash === user.hash) {
              res.locals.user = user.dataValues;
              return next();
            } else {
              return res
                .status(401)
                .json({ ok: false, message: "Invalid credentials." });
            }
          })
          .catch(() => {
            return res
              .status(401)
              .json({ ok: false, message: "Invalid credentials." });
          });
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() });
      }
    };
  }

  // Upload avatar
  uploadAvatar(client) {
    return async function (req, res, next) {
      const body = req.body;

      const s3 = client.S3;

      const buf = Buffer.from(
        req.body.avatar.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `users/${res.locals.user.id}.jpg`,
        ContentEncoding: "base64",
        ContentType: "image/jpeg",
        Body: buf,
      };

      s3.upload(params, (err, data) => {
        if (err) {
          console.log(err);
          return res.status(500).json({ ok: false, message: err.toString() });
        }

        console.log(data);
        next();
      });
    };
  }

  // Upload ad image
  uploadAdImage(client, adId, imageObject) {
    return new Promise((resolve, reject) => {
      const s3 = client.S3;

      const buf = Buffer.from(
        imageObject.image.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `ads/${adId}/${imageObject.id}.jpg`,
        ContentEncoding: "base64",
        ContentType: "image/jpeg",
        Body: buf,
      };

      s3.upload(params, (err, data) => {
        if (err) return reject(err);

        console.log(data);
        resolve();
      });
    });
  }

  // Upload Inbox image
  uploadInboxImage(client, inboxId, imageObject) {
    return new Promise((resolve, reject) => {
      const s3 = client.S3;

      console.log(imageObject);

      const buf = Buffer.from(
        imageObject.image.replace(/^data:image\/\w+;base64,/, ""),
        "base64"
      );

      const params = {
        Bucket: process.env.AWS_BUCKET,
        Key: `inboxes/${inboxId}/${imageObject.id}.jpg`,
        ContentEncoding: "base64",
        ContentType: "image/jpeg",
        Body: buf,
      };

      s3.upload(params, (err, data) => {
        if (err) return reject(err);

        console.log(data);
        resolve();
      });
    });
  }
};
