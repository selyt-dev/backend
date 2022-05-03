const { DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  return sequelize.define("Message", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1,
      primaryKey: true,
    },
    inboxId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Inbox",
        key: "id",
      },
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });
};
