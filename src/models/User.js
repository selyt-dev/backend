const crypto = require("crypto");
const { DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  return sequelize.define("User", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: false,
      set(value) {
        this.setDataValue("salt", crypto.randomBytes(16).toString("hex"));
        this.setDataValue(
          "hash",
          crypto
            .pbkdf2Sync(value, this.getDataValue("salt"), 1000, 64, "sha512")
            .toString("hex")
        );
      },
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    iban: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    nif: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    phone: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    hasAvatar: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    balance: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    role: {
      type: DataTypes.ENUM("user", "admin"),
      defaultValue: "user",
    },
    devicePushToken: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  });
};
