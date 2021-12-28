const { Route } = require('../')
const { Router } = require('express')
const { execSync } = require('child_process')

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
        gitCommit: execSync('git rev-parse HEAD').toString().trim() || null,
        version,
        lastChange: execSync('git log --oneline -1').toString().trim() || null,
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
