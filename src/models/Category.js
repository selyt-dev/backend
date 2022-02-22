const { DataTypes } = require("sequelize");

module.exports = function (sequelize) {
  return sequelize.define("Category", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    denomination: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING, // according to https://materialdesignicons.com/
      allowNull: false,
    },
  });
};
