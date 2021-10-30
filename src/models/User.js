const crypto = require('crypto')
const { DataTypes } = require('sequelize')

module.exports = function (sequelize) {
  return sequelize.define('User', {
    id: {
      type: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    hash: {
      type: DataTypes.STRING,
      allowNull: false,
      setterMethods: {
        setPassword (value) {
          this.setDataValue('salt', crypto.randomBytes(16).toString('hex'))
          this.setDataValue(
            'hash',
            crypto
              .pbkdf2Sync(value, this.salt, 1000, 64, 'sha512')
              .toString('hex')
          )
        },

        validatePassword (value) {
          const hash = crypto
            .pbkdf2Sync(value, this.salt, 1000, 64, 'sha512')
            .toString('hex')
          return this.hash === hash
        }
      }
    },
    salt: {
      type: DataTypes.STRING,
      allowNull: false
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    providerObject: {
      type: DataTypes.JSON,
      allowNull: false,
      setterMethods: {
        setProvider (provider, uid) {
          this.setDataValue('providerObject', { provider, uid })
        }
      }
    }
  })
}
