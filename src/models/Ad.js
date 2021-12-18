const { DataTypes } = require('sequelize')

module.exports = function (sequelize) {
  return sequelize.define('Ad', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV1,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Categories',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    images: {
      type: DataTypes.ARRAY(DataTypes.STRING), // Store array of image IDs
      allowNull: true
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true
    },
    isNegotiable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    region: {
      type: DataTypes.STRING,
      allowNull: false
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    visits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  })
}
