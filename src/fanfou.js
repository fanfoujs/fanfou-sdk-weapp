'use strict'

const qs = require('./modules/querystring/index')
const oauthSignature = require('./modules/oauth-signature/index')
const OAuth = require('./oauth')
const Status = require('./status')
const User = require('./user')
const DirectMessage = require('./direct-message')

class Fanfou {
  constructor (options) {
    options = options || {}

    // Required
    this.consumerKey = options.consumerKey
    this.consumerSecret = options.consumerSecret
    this.authType = options.auhtType

    // Optional
    this.protocol = options.protocol || 'https:'
    this.apiDomain = options.apiDomain || 'api.fanfou.com'
    this.requestUrl = options.requestUrl || 'https://fanfou.com/oauth/request_token'
    this.accessUrl = options.accessUrl || 'https://fanfou.com/oauth/access_token'

    // Oauth required
    this.oauthToken = options.oauthToken || ''
    this.oauthTokenSecret = options.oauthTokenSecret || ''

    // Xauth required
    this.username = options.username || ''
    this.password = options.password || ''

    this.oauth = new OAuth(
      this.requestUrl,
      this.accessUrl,
      this.consumerKey,
      this.consumerSecret,
      '1.0',
      null,
      'HMAC-SHA1'
    )
  }

  xauth () {
    return new Promise((resolve, reject) => {
      this.oauth.getXAuthAccessToken(this.username, this.password, (err, oauthToken, oauthTokenSecret) => {
        if (err) {
          reject(err)
        } else {
          this.oauth.oauth_token = oauthToken
          this.oauth.oauth_token_secret = oauthTokenSecret
          this.oauthToken = oauthToken
          this.oauthTokenSecret = oauthTokenSecret
          resolve({
            oauthToken,
            oauthTokenSecret
          })
        }
      })
    })
  }

  get (uri, parameters) {
    const url = this.protocol + '//' + this.apiDomain + uri + '.json'
    return new Promise((resolve, reject) => {
      this.oauth.get(
        url + '?' + qs.stringify(parameters),
        this.oauthToken,
        this.oauthTokenSecret,
        (err, data) => {
          if (err) {
            reject(err)
          } else if (data.error) {
            reject(new Error(data.error))
          } else {
            const result = Fanfou._parseData(data, Fanfou._uriType(uri))
            resolve(result)
          }
        }
      )
    })
  }

  post (uri, parameters) {
    return new Promise((resolve, reject) => {
      const url = this.protocol + '//' + this.apiDomain + uri + '.json'
      this.oauth.post(
        url,
        this.oauthToken,
        this.oauthTokenSecret,
        parameters,
        (err, data) => {
          if (err) {
            reject(err)
          } else if (data.error) {
            reject(new Error(data.error))
          } else {
            const result = Fanfou._parseData(data, Fanfou._uriType(uri))
            resolve(result)
          }
        }
      )
    })
  }

  upload (uri, fileObject, parameters) {
    const method = 'POST'
    const url = this.protocol + '//' + this.apiDomain + uri + '.json'
    const params = {
      oauth_consumer_key: this.consumerKey,
      oauth_token: this.oauthToken,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000),
      oauth_nonce: this.oauth._getNonce(6),
      oauth_version: '1.0'
    }
    const signature = oauthSignature.generate(
      method,
      url.replace(/https/, 'http').replace(/fanfou\.pro/, 'fanfou.com'),
      params,
      this.consumerSecret,
      this.oauthTokenSecret,
      {encodeSignature: false}
    )
    const authorizationHeader = this.oauth._buildAuthorizationHeaders(
      this.oauth._sortRequestParams(
        this.oauth._makeArrayOfArgumentsHash(params)
      ).concat([['oauth_signature', signature]])
    )
    const name = uri === '/photos/upload' ? 'photo' : uri === '/account/update_profile_image' ? 'image' : 'file'
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url,
        filePath: fileObject,
        header: {Authorization: authorizationHeader},
        name,
        formData: parameters,
        success (res) {
          const {data} = res
          if (data.error) {
            reject(new Error(data.error))
          }
          resolve(data)
        },
        fail () {
          reject(new Error('upload failed'))
        }
      })
    })
  }

  static _uriType (uri) {
    const uriList = {
      // Timeline
      '/search/public_timeline': 'timeline',
      '/search/user_timeline': 'timeline',
      '/photos/user_timeline': 'timeline',
      '/statuses/friends_timeine': 'timeline',
      '/statuses/home_timeline': 'timeline',
      '/statuses/public_timeline': 'timeline',
      '/statuses/replies': 'timeline',
      '/statuses/user_timeline': 'timeline',
      '/statuses/context_timeline': 'timeline',
      '/statuses/mentions': 'timeline',
      '/favorites': 'timeline',

      // Status
      '/statuses/update': 'status',
      '/statuses/show': 'status',
      '/favorites/destroy': 'status',
      '/favorites/create': 'status',

      // Users
      '/users/tagged': 'users',
      '/users/followers': 'users',
      '/users/friends': 'users',
      '/friendships/requests': 'users',

      // User
      '/users/show': 'user',
      '/friendships/create': 'user',
      '/friendships/destroy': 'user',
      '/account/verify_credentials': 'user',

      // Conversation
      '/direct_messages/conversation': 'conversation',
      '/direct_messages/inbox': 'conversation',
      '/direct_messages/sent': 'conversation',

      // Conversation List
      '/direct_messages/conversation_list': 'conversation-list',

      // Direct Message
      '/direct_messages/new': 'dm',
      '/direct_messages/destroy': 'dm'
    }
    return uriList[uri] || null
  }

  static _parseList (data, type) {
    const arr = []
    for (const i in data) {
      if (data[i]) {
        switch (type) {
          case 'timeline':
            arr.push(new Status(data[i]))
            break
          case 'users':
            arr.push(new User(data[i]))
            break
          case 'conversation':
            arr.push(new DirectMessage(data[i]))
            break
          case 'conversation-list':
            data[i].dm = new DirectMessage(data[i].dm)
            arr.push(data[i])
            break
          default:
            break
        }
      }
    }
    return arr
  }

  static _parseData (data, type) {
    switch (type) {
      case 'timeline':
      case 'users':
      case 'conversation':
      case 'conversation-list':
        return Fanfou._parseList(data, type)
      case 'status':
        return new Status(data)
      case 'user':
        return new User(data)
      case 'dm':
        return new DirectMessage(data)
      default:
        return data
    }
  }
}

module.exports = Fanfou
