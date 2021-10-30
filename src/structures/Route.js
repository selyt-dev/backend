module.exports = class Route {
  constructor (opts) {
    this.name = opts.name
    this.parentRoute = opts.parentRoute || ''

    this.subRoutes = null
  }

  get path () {
    return `${this.parentRoute ? '' : ''}${
      this.parentRoute ? this.parentRoute.path : ''
    }/${this.name}`
  }

  _register (app) {
    if (this.subRoutes) {
      this.subRoutes.forEach(route => {
        route._register(app)
      })
    }

    this.register(app)
  }

  register (app) {}
}
