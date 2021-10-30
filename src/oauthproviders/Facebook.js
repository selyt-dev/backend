const { OAuthProvider } = require('../')
const axios = require('axios')

module.exports = class FacebookOAuthProvider extends OAuthProvider {
  constructor (client) {
    super(
      {
        name: 'facebook',
        scopes: ['email', 'public_profile'],
        authBaseUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
        baseUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
        clientId: process.env.FACEBOOK_CLIENT_ID,
        clientSecret: process.env.FACEBOOK_CLIENT_SECRET
      },
      client
    )
  }

  getUserData (accessToken) {
    return axios
      .get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,name,email,picture',
          access_token: accessToken
        }
      })
      .then(({ data }) => {
        return {
          id: data.id,
          name: data.name,
          email: data.email,
          picture: data.picture?.data.url
        }
      })
  }
}
