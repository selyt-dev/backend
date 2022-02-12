const { DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  return sequelize.define("SupportRequest", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "REJECTED", "RESOLVED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
  });
};
