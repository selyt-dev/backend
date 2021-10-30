const { Route } = require('../')
const { Router } = require('express')

const { version } = require('../../package.json')

module.exports = class Main extends Route {
  constructor (client) {
    super(
      {
        name: ''
      },
      client
    )
  }

  register (app) {
    const router = Router()

    router.get('/', (req, res) => {
      res.status(200).json({
        ok: true,
        environment: process.env.NODE_ENV || 'development',
        version
      })
    })

    app.use(this.path, router)
  }
}
