const express = require("express");
const fileUpload = require("express-fileupload");

const AWS = require("aws-sdk");

const { FileUtils, RouteUtils } = require("./utils");

const { Sequelize } = require("sequelize");

const { Route, ErrorMessage } = require("./structures");

const nodemailer = require("nodemailer");

const socket = require("socket.io");
const http = require("http");

module.exports = class Api {
  constructor() {
    this.app = null;
    this.port = process.env.PORT || 8080;
    this.hostname = process.env.HOSTNAME || "0.0.0.0";

    this.routes = [];
    this.oauthproviders = [];

    this.logger = null;

    this.database = null;

    this.routeUtils = new RouteUtils();

    this.S3 = null;
    this.uploadS3 = null;

    this.mailer = null;

    this.server = null;
    this.io = null;

    this.errors = ErrorMessage.ErrorType;
  }

  async load() {
    this.S3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    this.app = express();
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(require("cors")());

    this.mailer = nodemailer.createTransport({
      host: process.env.EMAIL_SMTP,
      port: 25,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.mailer.verify((error, success) => {
      if (error) {
        this.logger.error("Email verification failed - %s", error.toString());
      } else {
        this.logger.log("Email verification successful.");
      }
    });
    // this.app.use(fileUpload())

    this.logger = require("tracer").colorConsole({
      format: "{{timestamp}} <{{title}}> {{message}}",
    });

    this.server = http.createServer(this.app);
    this.io = socket(this.server);
    this.server.listen(this.port, () => {
      this.logger.info("Server listening on port %s", this.port);
      this.initializeRoutes();
      this.connectToDatabase();
    });

    this.io.on("connection", (socket) => {
      this.logger.info("Someone connected!");

      socket.on("authenticate", ({ token }) => {
        this.logger.info("Someone authenticated!");
        this.logger.info(token);

        this.routeUtils._validateLogin(token, this).then((user) => {
          this.logger.info("User authenticated!");
          this.logger.info(user);
          socket.emit("authenticated", user);
        });
      });

      socket.on("message", ({ message, sid, rid }) => {
        this.logger.info("Someone sent a message!");
        this.io.to(rid).emit("message", { message, sid });
      });
    });
  }

  initializeRoutes(dirPath = "src/routes") {
    let success = 0;
    let failed = 0;
    return FileUtils.requireDirectory(dirPath, (NewRoute) => {
      if (Object.getPrototypeOf(NewRoute) !== Route) return;
      this.addRoute(new NewRoute(this)) ? success++ : failed++;
    }).then(() => {
      if (failed) {
        this.logger.warn("%s HTTP routes loaded, %d failed.", success, failed);
      } else {
        this.logger.info("All %s HTTP routes loaded without errors.", success);
      }
    });
  }

  addRoute(route) {
    if (!(route instanceof Route)) {
      this.logger.warn("%s failed to load - Not a Route", route);
      return false;
    }

    route._register(this.app);
    this.routes.push(route);
    return true;
  }

  async connectToDatabase() {
    if (!process.env.DATABASE_URL) {
      this.logger.warn(
        "Database not started - Environment variable DATABASE_URL wasn't found."
      );
      return;
    }

    const sequelize = new Sequelize(process.env.DATABASE_URL, {
      dialect: "postgres",
      ssl: {
        rejectUnauthorized: false,
      },
    });

    try {
      await sequelize.authenticate();
      this.logger.log("Database connection established successfully.");

      this.loadModels();

      this.database = sequelize;
    } catch (err) {
      this.logger.error(
        "Database connection wasn't established - %s",
        err.toString()
      );
    }
  }

  loadModels(dirPath = "src/models") {
    let success = 0;
    let failed = 0;
    return FileUtils.requireDirectory(dirPath, (NewModel) => {
      try {
        NewModel(this.database);
        success++;
      } catch (err) {
        this.logger.error(err);
        failed++;
      }
    }).then(() => {
      this.database.sync();
      if (failed) {
        this.logger.warn("%s models loaded, %d failed.", success, failed);
      } else this.logger.info("All %s models loaded without errors.", success);

      // Make joins
      this.database.models.User.hasMany(this.database.models.SupportRequest, {
        foreignKey: "userId",
      });
      this.database.models.SupportRequest.belongsTo(this.database.models.User, {
        foreignKey: "userId",
      });

      this.database.models.User.hasMany(this.database.models.Inbox, {
        foreignKey: "senderId",
      });
      this.database.models.Inbox.belongsTo(this.database.models.User, {
        foreignKey: "senderId",
      });

      this.database.models.User.hasMany(this.database.models.Ad, {
        foreignKey: "userId",
      });
      this.database.models.Ad.belongsTo(this.database.models.User, {
        foreignKey: "userId",
      });

      this.database.models.Category.hasMany(this.database.models.Ad, {
        foreignKey: "categoryId",
      });
      this.database.models.Ad.belongsTo(this.database.models.Category, {
        foreignKey: "categoryId",
      });

      this.database.models.User.hasMany(this.database.models.Inbox, {
        foreignKey: "senderId",
      });

      this.database.models.Inbox.belongsTo(this.database.models.User, {
        as: "sender",
        foreignKey: "senderId",
      });

      this.database.models.User.hasMany(this.database.models.Inbox, {
        foreignKey: "receiverId",
      });

      this.database.models.Inbox.belongsTo(this.database.models.User, {
        as: "receiver",
        foreignKey: "receiverId",
      });

      this.database.models.Ad.hasMany(this.database.models.Inbox, {
        foreignKey: "adId",
      });

      this.database.models.Inbox.belongsTo(this.database.models.Ad, {
        as: "ad",
        foreignKey: "adId",
      });
    });
  }
};
