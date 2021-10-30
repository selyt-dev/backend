const { OAuthProvider } = require('../')
const axios = require('axios')

module.exports = class GoogleOAuthProvider extends OAuthProvider {
  constructor (client) {
    super(
      {
        name: 'google',
        scopes: [
          'openid',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile'
        ],
        authBaseUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        baseUrl: 'https://oauth2.googleapis.com/token',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET
      },
      client
    )
  }

  getUserData (accessToken) {
    return axios
      .get('https://www.googleapis.com/userinfo/v2/me', {
        headers: {
          authorization: `Bearer ${accessToken}`
        }
      })
      .then(({ data }) => {
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          picture: data.picture
        }
      })
  }
}
