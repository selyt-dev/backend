const { DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  return sequelize.define("Inbox", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    receiverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Users",
        key: "id",
      },
    },
    adId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "Ads",
        key: "id",
      },
    },
    messages: {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: true,
      defaultValue: [],
      set(value) {
        const messages = this.getDataValue("messages") || [];
        messages.push(value);
        this.setDataValue("messages", messages);
      },
    },
  });
};
