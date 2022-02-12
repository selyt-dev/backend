const express = require("express");
const fileUpload = require("express-fileupload");

const AWS = require("aws-sdk");

const { FileUtils, RouteUtils } = require("./utils");

const { Sequelize } = require("sequelize");

const { Route } = require("./structures");

const nodemailer = require("nodemailer");

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
  }

  async load() {
    this.S3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION,
    });

    this.app = express();
    this.app.use(express.json());
    this.app.use(require("cors")());

    this.mailer = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    // this.app.use(fileUpload())

    this.logger = require("tracer").colorConsole({
      format: "{{timestamp}} <{{title}}> {{message}}",
    });

    this.app.listen(this.port, this.hostname, () => {
      this.logger.info("Server listening on port %s", this.port);
      this.initializeRoutes();
      this.connectToDatabase();
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

      this.database.models.User.hasMany(this.database.models.Transaction, {
        foreignKey: "userId",
      });
      this.database.models.Transaction.belongsTo(this.database.models.User, {
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
    });
  }
};
