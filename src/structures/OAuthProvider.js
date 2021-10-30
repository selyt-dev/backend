const { URLSearchParams } = require('url')
const axios = require('axios')

module.exports = class OAuthProvider {
  constructor (opts) {
    this.name = opts.name
    this.scopes = opts.scopes || []

    this.authBaseUrl = opts.authBaseUrl
    this.baseUrl = opts.baseUrl
    this.clientId = opts.clientId
    this.clientSecret = opts.clientSecret
  }

  getToken (queryParameters = {}) {
    queryParameters.client_id = this.clientId
    queryParameters.scope = this.scopes.join(' ')
    queryParameters.response_type = 'code'
    queryParameters.redirect_uri = `${process.env.API_BASE_URL}/auth/${this.name}/callback`

    const urlQueryParameters = new URLSearchParams(queryParameters)
    return `${this.authBaseUrl}?${urlQueryParameters}`
  }

  validateCode (code, scope = '') {
    return axios.post(this.baseUrl, {
      code,
      redirect_uri: `${process.env.API_BASE_URL}/auth/${this.name}/callback`,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: scope || this.scopes.join(' '),
      grant_type: 'authorization_code'
    })
  }

  getUserData () {}
}
