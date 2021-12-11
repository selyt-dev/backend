/* eslint prefer-regex-literals: "off" */
const { Op } = require('sequelize')

const { Route } = require('../')
const { Router } = require('express')
const Joi = require('joi')

module.exports = class User extends Route {
  constructor (client) {
    super(
      {
        name: 'user'
      },
      client
    )

    this.client = client
  }

  register (app) {
    const router = Router()

    router.post('/register', this.client.routeUtils.verifyRegister(this.client))

    router.post('/login', this.client.routeUtils.verifyLogin(this.client))

    router.get('/@me', this.client.routeUtils.validateLogin(this.client), async (_req, res) => {
      return res.status(200).json({ ok: true, user: res.locals.user })
    })

    router.post('/@me/avatar', this.client.routeUtils.validateLogin(this.client), this.client.routeUtils.uploadAvatar(this.client), async (req, res) => {
      return res.status(200).json({ ok: true })
    })

    router.put('/@me', this.client.routeUtils.validateLogin(this.client), async (req, res) => {
      const body = req.body

      const schema = Joi.object({
        email: Joi.string()
          .email()
          .required(),
        nif: Joi.number()
          .integer()
          .min(100000000)
          .max(999999999)
          .required(),
        phone: Joi.number()
          .integer()
          .min(100000000)
          .max(999999999)
          .required(),
        iban: Joi.string()
          .pattern(new RegExp(/(PT50)([0-9]{21})/))
      })

      try {
        const value = await schema.validateAsync(body)

        this.client.database.models.User.findOne({
          where: {
            [Op.or]: [{ email: value.email }, { nif: value.nif }, { phone: value.phone }, { iban: value.iban || '' }]
          }
        }).then(_user => {
          if (_user) {
            return res.status(400).json({ ok: false, message: 'User data already exists in the platform.' })
          }

          this.client.database.models.User.update(value, {
            where: {
              id: res.locals.user.id
            }
          }).then(() => {
            return res.status(200).json({ ok: true })
          }).catch(err => {
            return res.status(500).json({ ok: false, message: err.toString() })
          })
        }).catch(err => {
          return res.status(500).json({ ok: false, message: err.toString() })
        })
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() })
      }
    })

    router.put('/@me/password', this.client.routeUtils.validateLogin(this.client), async (req, res) => {
      const body = req.body

      const schema = Joi.object({
        password: Joi.string()
          .pattern(new RegExp('^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$'))
          .required(),
        password_confirmation: Joi.ref('password')
      })

      try {
        const value = await schema.validateAsync(body)

        this.client.database.models.User.update({
          hash: value.password
        }, {
          where: {
            id: res.locals.user.id
          }
        }).then(() => {
          return res.status(200).json({ ok: true })
        }).catch(err => {
          return res.status(500).json({ ok: false, message: err.toString() })
        })
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() })
      }
    })

    app.use(this.path, router)
  }
}
