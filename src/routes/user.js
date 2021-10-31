/* eslint prefer-regex-literals: "off" */

const { Op } = require('sequelize')

const crypto = require('crypto')
const jwt = require('jsonwebtoken')

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

    router.post('/register', async (req, res) => {
      const body = req.body

      const schema = Joi.object({
        name: Joi.string().required(),
        email: Joi.string()
          .email()
          .required(),
        password: Joi.string()
          .pattern(new RegExp('^(?=.*[A-Za-z])(?=.*\\d)[A-Za-z\\d]{8,}$'))
          .required(),
        password_confirmation: Joi.ref('password').required(),
        birthDate: Joi.date().required(),
        nif: Joi.number()
          .integer()
          .required()
          .min(111111111)
          .max(999999999)
      })

      try {
        const value = await schema.validateAsync(body)

        this.client.database.models.User.findOrCreate({
          where: {
            [Op.or]: [{ email: value.email }, { nif: value.nif }]
          },
          defaults: {
            name: value.name,
            hash: value.password,
            birthDate: value.birthDate
          }
        })
          .then(([user, created]) => {
            if (created) return res.status(200).json({ ok: true, uid: user.id })
            else {
              return res.status(403).json({
                ok: false,
                message: 'User already exists in platform.'
              })
            }
          })
          .catch(err => {
            console.log(err)
            return res.status(500).json({ ok: false, message: err.toString() })
          })
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() })
      }
    })

    router.post('/login', async (req, res) => {
      const body = req.body

      const schema = Joi.object({
        email: Joi.string()
          .email()
          .required(),
        password: Joi.string().required()
      })

      try {
        const value = await schema.validateAsync(body)

        this.client.database.models.User.findOne({
          where: { email: value.email }
        })
          .then(user => {
            const hash = crypto
              .pbkdf2Sync(value.password, user.salt, 1000, 64, 'sha512')
              .toString('hex')

            if (hash === user.hash) {
              const authorization = jwt.sign(
                `${user.email}:${value.password}`,
                process.env.JWT_SECRET
              )

              return res
                .status(200)
                .json({ ok: true, authorization: `Basic ${authorization}` })
            } else {
              return res
                .status(401)
                .json({ ok: false, message: 'Invalid credentials.' })
            }
          })
          .catch(() => {
            return res
              .status(401)
              .json({ ok: false, message: 'Invalid credentials.' })
          })
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() })
      }
    })

    router.get('/@me', async (req, res) => {
      let authHeader = req.headers.authorization

      if (!req.headers.authorization || !authHeader.startsWith('Basic ')) {
        return res
          .status(401)
          .json({ ok: false, message: "User isn't authenticated." })
      }

      try {
        authHeader = authHeader.replace('Basic ', '')

        let authData = await jwt.verify(authHeader, process.env.JWT_SECRET)

        authData = authData.split(':')

        this.client.database.models.User.findOne({
          where: { email: authData[0] }
        })
          .then(user => {
            const hash = crypto
              .pbkdf2Sync(authData[1], user.salt, 1000, 64, 'sha512')
              .toString('hex')

            if (hash === user.hash) {
              const { hash, salt, ...userObj } = user.dataValues

              return res.status(200).json({ ok: true, user: userObj })
            } else {
              return res
                .status(401)
                .json({ ok: false, message: 'Invalid credentials.' })
            }
          })
          .catch(() => {
            return res
              .status(401)
              .json({ ok: false, message: 'Invalid credentials.' })
          })
      } catch (err) {
        return res.status(400).json({ ok: false, message: err.toString() })
      }
    })

    app.use(this.path, router)
  }
}
