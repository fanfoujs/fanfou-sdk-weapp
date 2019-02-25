'use strict';

const oauth = require('./vendor/oauth-1.0a/index');
const hmacsha1 = require('./vendor/hmacsha1/index');
const queryString = require('./vendor/query-string/index');
const Status = require('./status');
const User = require('./user');
const DirectMessage = require('./direct-message');
const FanfouError = require('./ff-error');

class Fanfou {
	constructor(opt = {}) {
		const {
			consumerKey = '',
			consumerSecret = '',
			oauthToken = '',
			oauthTokenSecret = '',
			username = '',
			password = '',
			apiDomain = 'api.fanfou.com',
			oauthDomain = 'fanfou.com',
			protocol = 'https:',
			hooks = {}
		} = opt;

		this.consumerKey = consumerKey;
		this.consumerSecret = consumerSecret;
		this.oauthToken = oauthToken;
		this.oauthTokenSecret = oauthTokenSecret;
		this.username = username;
		this.password = password;
		this.apiDomain = apiDomain;
		this.oauthDomain = oauthDomain;
		this.protocol = protocol;
		this.hooks = hooks;

		this.oauthInit();
		this.apiInit();
	}

	oauthInit() {
		this.o = oauth({
			consumer: {key: this.consumerKey, secret: this.consumerSecret},
			signature_method: 'HMAC-SHA1',
			parameter_seperator: ',',
			hash_function: (baseString, key) => {
				const {baseString: baseStringHook} = this.hooks;
				if (baseStringHook) {
					baseString = baseStringHook(baseString);
				}

				return hmacsha1(key, baseString);
			}
		});
	}

	apiInit() {
		this.apiEndPoint = `${this.protocol}//${this.apiDomain}`;
		this.oauthEndPoint = `${this.protocol}//${this.oauthDomain}`;
	}

	xauth() {
		return new Promise((resolve, reject) => {
			const url = `${this.oauthEndPoint}/oauth/access_token`;
			const params = {
				x_auth_mode: 'client_auth',
				x_auth_password: this.password,
				x_auth_username: this.username
			};
			const {Authorization} = this.o.toHeader(this.o.authorize({url, method: 'POST'}));
			wx.request({
				url,
				method: 'POST',
				header: {
					Authorization,
					'content-type': 'application/x-www-form-urlencoded'
				},
				data: queryString.stringify(params),
				success: res => {
					if (res.statusCode === 200) {
						const result = queryString.parse(res.data);
						const {
							oauth_token: oauthToken,
							oauth_token_secret: oauthTokenSecret
						} = result;
						this.oauthToken = oauthToken;
						this.oauthTokenSecret = oauthTokenSecret;
						resolve({oauthToken, oauthTokenSecret});
					} else {
						reject(new FanfouError(res));
					}
				},
				fail: err => {
					reject(new FanfouError(err));
				}
			});
		});
	}

	get(uri, params) {
		const query = queryString.stringify(params);
		const url = `${this.apiEndPoint}${uri}.json${query ? `?${query}` : ''}`;
		const token = {key: this.oauthToken, secret: this.oauthTokenSecret};
		const {Authorization} = this.o.toHeader(this.o.authorize({url, method: 'GET'}, token));
		return new Promise((resolve, reject) => {
			wx.request({
				url,
				method: 'GET',
				header: {
					Authorization,
					'content-type': 'application/x-www-form-urlencoded'
				},
				data: queryString.stringify(params),
				success: res => {
					if (res.statusCode === 200) {
						const result = Fanfou._parseData(res.data, Fanfou._uriType(uri));
						resolve(result);
					} else {
						reject(new FanfouError(res.data));
					}
				},
				fail: err => {
					reject(new FanfouError(err));
				}
			});
		});
	}

	post(uri, params) {
		const url = `${this.apiEndPoint}${uri}.json`;
		const token = {key: this.oauthToken, secret: this.oauthTokenSecret};
		const isUpload = ['/photos/upload', '/account/update_profile_image'].indexOf(uri) >= 0;
		const {Authorization} = this.o.toHeader(this.o.authorize({url, method: 'POST', data: isUpload ? null : params}, token));
		return new Promise((resolve, reject) => {
			wx.request({
				url,
				method: 'POST',
				header: {
					Authorization,
					'content-type': 'application/x-www-form-urlencoded'
				},
				data: queryString.stringify(params),
				success: res => {
					if (res.statusCode === 200) {
						const result = Fanfou._parseData(res.data, Fanfou._uriType(uri));
						resolve(result);
					} else {
						reject(new FanfouError(res));
					}
				},
				fail: err => {
					reject(new FanfouError(err));
				}
			});
		});
	}

	upload(uri, fileObject, parameters) {
		const url = `${this.apiEndPoint}${uri}.json`;
		const token = {key: this.oauthToken, secret: this.oauthTokenSecret};
		const {Authorization} = this.o.toHeader(this.o.authorize({url, method: 'POST'}, token));
		const name = uri === '/photos/upload' ? 'photo' : uri === '/account/update_profile_image' ? 'image' : 'file';
		return new Promise((resolve, reject) => {
			wx.uploadFile({
				url,
				filePath: fileObject,
				header: {Authorization},
				name,
				formData: parameters,
				success(res) {
					const {data} = res;
					if (data.error) {
						reject(new Error(data.error));
					} else {
						resolve(data);
					}
				},
				fail() {
					reject(new Error('upload failed'));
				}
			});
		});
	}

	static _uriType(uri) {
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
		};
		return uriList[uri] || null;
	}

	static _parseList(data, type) {
		const arr = [];
		for (const i in data) {
			if (data[i]) {
				switch (type) {
					case 'timeline':
						arr.push(new Status(data[i]));
						break;
					case 'users':
						arr.push(new User(data[i]));
						break;
					case 'conversation':
						arr.push(new DirectMessage(data[i]));
						break;
					case 'conversation-list':
						data[i].dm = new DirectMessage(data[i].dm);
						arr.push(data[i]);
						break;
					default:
						break;
				}
			}
		}
		return arr;
	}

	static _parseData(data, type) {
		switch (type) {
			case 'timeline':
			case 'users':
			case 'conversation':
			case 'conversation-list':
				return Fanfou._parseList(data, type);
			case 'status':
				return new Status(data);
			case 'user':
				return new User(data);
			case 'dm':
				return new DirectMessage(data);
			default:
				return data;
		}
	}
}

module.exports = Fanfou;
