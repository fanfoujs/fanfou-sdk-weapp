# fanfou-sdk-weapp

[![](https://img.shields.io/travis/LitoMore/fanfou-sdk-weapp/master.svg)](https://travis-ci.org/LitoMore/fanfou-sdk-weapp)
[![](https://img.shields.io/npm/v/fanfou-sdk-weapp.svg)](https://www.npmjs.com/package/fanfou-sdk-weapp)
[![](https://img.shields.io/npm/l/fanfou-sdk-weapp.svg)](https://github.com/LitoMore/fanfou-sdk-weapp/blob/master/LICENSE)
[![](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/xojs/xo)

Fanfou SDK for WeApp

> The package is for WeApp, if you are developing with Node.js, please use [fanfou-sdk](https://github.com/LitoMore/fanfou-sdk-node).

## Install

```bash
$ npm i fanfou-sdk-weapp
```

Or you can copy the `src` directory to your project.

## Usage

```javascript
const Fanfou = require('fanfou-sdk-weapp')
// or
const Fanfou = require('./src/index')
```

**OAuth**

```javascript
const ff = new Fanfou({
  consumerKey: '',
  consumerSecret: '',
  oauthToken: '',
  oauthTokenSecret: ''
})

ff.get('/statuses/home_timeline', {format: 'html'})
  .then(res => console.log(res))
  .catch(err => console.log(err))
```

**XAuth**

```javascript
const ff = new Fanfou({
  authType: 'xauth',
  consumerKey: '',
  consumerSecret: '',
  username: '',
  password: ''
})

ff.xauth()
  .then(res => {
    console.log(res)
    ff.get('/statuses/public_timeline', {count: 10})
      .then(res => console.log(res))
      .catch(err => console.log(err))

    ff.post('/statuses/update', {status: 'Hi Fanfou'})
      .then(res => console.log(res))
      .catch(err => console.log(err))
  })

```

**Options**

- `authType`: Support `oauth` and `xuath`, default is `oauth`
- `consumerKey`: The consumer key
- `consumerSecret`: The consumer secret
- `oauthToken`: The OAuth token
- `oauthTokenSecret`: The OAuth token secret
- `username`: The Fanfou username
- `password`: The Fanfou password
- `protocol`: Set the prototol, default is `https:`
- `apiDomain`: Set the API domain, default is `api.fanfou.com`
- `oauthDomain`: Set the OAuth domain, default is `fanfou.com`

> For more Fanfou API docs, see the [Fanfou API doc](https://github.com/FanfouAPI/FanFouAPIDoc/wiki).

## API

```javascript
ff.xauth()
ff.get(uri, params)
ff.post(uri, params)
ff.upload(uri, fileObject, parameters)
```

**Examples**

```javascript
// OAuth
ff.get('/statuses/home_timeline', {})
  .then(res => console.log(res))
  .catch(err => console.log(err))

ff.post('/statuses/update', {status: 'post test'})
  .then(res => console.log(res))
  .catch(err => console.log(err))

// Upload
wx.chooseImage({
  count: 1,
  sizeType: ['original', 'compressed'],
  sourceType: ['album', 'camera'],
  success: res => {
    const {tempFilePaths} = res
    const [fileObject] = tempFilePaths
    ff.upload('/photos/upload', fileObject, {})
      .then(res => console.log(res))
      .catch(err => console.log(err))
  }
})

// XAuth
ff.xauth()
  .then(res => {
    ff.get('/statuses/public_timeline', {})
      .then(res => console.log(res))
      .catch(err => console.log(err))
  })
  .catch(err => console.log(err))
```

## Related

- [xiaofan](https://github.com/fanfoujs/xiaofan) - WeApp for Fanfou
- [fanta](https://github.com/LitoMore/fanta) - Another WeApp for Fanfou
- [fanfou-sdk](https://github.com/LitoMore/fanfou-sdk-node) - Fanfou SDK for Node.js

## License

MIT © [LitoMore](https://github.com/LitoMore)
