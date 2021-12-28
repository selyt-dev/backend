const { Route } = require('../')
const { Router } = require('express')

const { hostname } = require('os')

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

    router.get('/', (_req, res) => {
      res.status(200).json({
        ok: true,
        environment: process.env.NODE_ENV || 'development',
        version,
        os: {
          platform: process.platform,
          arch: process.arch,
          hostname: hostname()
        }
      })
    })

    app.use(this.path, router)
  }
}
