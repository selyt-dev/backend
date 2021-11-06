const express = require('express')
const { FileUtils, RouteUtils } = require('./utils')

const { Sequelize } = require('sequelize')

const { Route, OAuthProvider } = require('./structures')

module.exports = class Api {
  constructor () {
    this.app = null
    this.port = process.env.PORT || 8080
    this.hostname = process.env.HOSTNAME || '0.0.0.0'

    this.routes = []
    this.oauthproviders = []

    this.logger = null

    this.database = null

    this.routeUtils = new RouteUtils()
  }

  async load () {
    this.app = express()
    this.app.use(express.json())
    this.app.use(require('cors')())

    this.logger = require('tracer').colorConsole({
      format: '{{timestamp}} <{{title}}> {{message}}'
    })

    this.app.listen(this.port, this.hostname, () => {
      this.logger.info('Server listening on port %s', this.port)
      this.initializeRoutes()
      this.initializeOAuthProviders()
      this.connectToDatabase()
    })
  }

  initializeRoutes (dirPath = 'src/routes') {
    let success = 0
    let failed = 0
    return FileUtils.requireDirectory(dirPath, NewRoute => {
      if (Object.getPrototypeOf(NewRoute) !== Route) return
      this.addRoute(new NewRoute(this)) ? success++ : failed++
    }).then(() => {
      if (failed) {
        this.logger.warn('%s HTTP routes loaded, %d failed.', success, failed)
      } else {
        this.logger.info('All %s HTTP routes loaded without errors.', success)
      }
    })
  }

  addRoute (route) {
    if (!(route instanceof Route)) {
      this.logger.warn('%s failed to load - Not a Route', route)
      return false
    }

    route._register(this.app)
    this.routes.push(route)
    return true
  }

  initializeOAuthProviders (dirPath = 'src/oauthproviders') {
    let success = 0
    let failed = 0
    return FileUtils.requireDirectory(dirPath, NewOAuthProvider => {
      if (Object.getPrototypeOf(NewOAuthProvider) !== OAuthProvider) return
      this.addOAuthProvider(new NewOAuthProvider(this)) ? success++ : failed++
    }).then(() => {
      if (failed) {
        this.logger.warn(
          '%s OAuth providers loaded, %d failed.',
          success,
          failed
        )
      } else {
        this.logger.info(
          'All %s OAuth providers loaded without errors.',
          success
        )
      }
    })
  }

  addOAuthProvider (oauthprovider) {
    if (!(oauthprovider instanceof OAuthProvider)) {
      this.logger.warn('%s failed to load - Not a OAuthProvider', oauthprovider)
      return false
    }

    this.oauthproviders.push(oauthprovider)
    return true
  }

  async connectToDatabase () {
    if (!process.env.DATABASE_OBJECT) {
      this.logger.warn(
        "Database not started - Environment variable DATABASE_OBJECT wasn't found."
      )
      return
    }

    const database = JSON.parse(process.env.DATABASE_OBJECT)

    const sequelize = new Sequelize(
      database.name,
      database.username,
      database.password,
      {
        host: database.host,
        dialect: 'postgres'
      }
    )

    try {
      await sequelize.authenticate()
      this.logger.log('Database connection established successfully.')

      this.loadModels()

      this.database = sequelize
    } catch (err) {
      this.logger.error(
        "Database connection wasn't established - %s",
        err.toString()
      )
    }
  }

  loadModels (dirPath = 'src/models') {
    let success = 0
    let failed = 0
    return FileUtils.requireDirectory(dirPath, NewModel => {
      try {
        NewModel(this.database)
        success++
      } catch (err) {
        this.logger.error(err)
        failed++
      }
    }).then(() => {
      this.database.sync()
      if (failed) {
        this.logger.warn('%s models loaded, %d failed.', success, failed)
      } else this.logger.info('All %s models loaded without errors.', success)
    })
  }
}
