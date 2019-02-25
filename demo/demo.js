'use strict';

const Fanfou = require('../src/index');

Page({
	data: {
		key: '2602578f6379ad3cc52b6269cb63d25c',
		secret: '4676969b8faae10064caa2f19c36d5c0',
		username: '',
		password: ''
	},

	keyInput(e) {
		const {value: key} = e.detail;
		this.setData({key});
	},

	secretInput(e) {
		const {value: secret} = e.detail;
		this.setData({secret});
	},

	usernameInput(e) {
		const {value: username} = e.detail;
		this.setData({username});
	},

	passwordInput(e) {
		const {value: password} = e.detail;
		this.setData({password});
	},

	testTap() {
		const {key: consumerKey, secret: consumerSecret, username, password} = this.data;
		const ff = new Fanfou({
			consumerKey,
			consumerSecret,
			username,
			password,
			hooks: {
				baseString: str => str.replace('https', 'http')
			}
		});

		ff.xauth()
			.then(() => {
				ff.get('/statuses/home_timeline', {count: 5});
			});
	}
});
