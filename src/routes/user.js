const { Route } = require('../')
const { Router } = require('express')

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

    app.use(this.path, router)
  }
}
