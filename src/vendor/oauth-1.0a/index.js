function OAuth(opts) {
	if (!(this instanceof OAuth)) {
		return new OAuth(opts);
	}

	if (!opts) {
		opts = {};
	}

	if (!opts.consumer) {
		throw new Error('consumer option is required');
	}

	this.consumer = opts.consumer;
	this.nonce_length = opts.nonce_length || 32;
	this.version = opts.version || '1.0';
	this.parameter_seperator = opts.parameter_seperator || ', ';
	this.realm = opts.realm;

	if (typeof opts.last_ampersand === 'undefined') {
		this.last_ampersand = true;
	} else {
		this.last_ampersand = opts.last_ampersand;
	}

	// Default signature_method is 'PLAINTEXT'
	this.signature_method = opts.signature_method || 'PLAINTEXT';

	if (this.signature_method === 'PLAINTEXT' && !opts.hash_function) {
		opts.hash_function = function (base_string, key) {
			return key;
		};
	}

	if (!opts.hash_function) {
		throw new Error('hash_function option is required');
	}

	this.hash_function = opts.hash_function;
	this.body_hash_function = opts.body_hash_function || this.hash_function;
}

OAuth.prototype.authorize = function (request, token) {
	const oauth_data = {
		oauth_consumer_key: this.consumer.key,
		oauth_nonce: this.getNonce(),
		oauth_signature_method: this.signature_method,
		oauth_timestamp: this.getTimeStamp(),
		oauth_version: this.version
	};

	if (!token) {
		token = {};
	}

	if (token.key !== undefined) {
		oauth_data.oauth_token = token.key;
	}

	if (!request.data) {
		request.data = {};
	}

	if (request.includeBodyHash) {
		oauth_data.oauth_body_hash = this.getBodyHash(request, token.secret);
	}

	oauth_data.oauth_signature = this.getSignature(request, token.secret, oauth_data);

	return oauth_data;
};

OAuth.prototype.getSignature = function (request, token_secret, oauth_data) {
	return this.hash_function(this.getBaseString(request, oauth_data), this.getSigningKey(token_secret));
};

OAuth.prototype.getBodyHash = function (request, token_secret) {
	const body = typeof request.data === 'string' ? request.data : JSON.stringify(request.data);

	if (!this.body_hash_function) {
		throw new Error('body_hash_function option is required');
	}

	return this.body_hash_function(body, this.getSigningKey(token_secret));
};

OAuth.prototype.getBaseString = function (request, oauth_data) {
	return request.method.toUpperCase() + '&' + this.percentEncode(this.getBaseUrl(request.url)) + '&' + this.percentEncode(this.getParameterString(request, oauth_data));
};

OAuth.prototype.getParameterString = function (request, oauth_data) {
	let base_string_data;
	if (oauth_data.oauth_body_hash) {
		base_string_data = this.sortObject(this.percentEncodeData(this.mergeObject(oauth_data, this.deParamUrl(request.url))));
	} else {
		base_string_data = this.sortObject(this.percentEncodeData(this.mergeObject(oauth_data, this.mergeObject(request.data, this.deParamUrl(request.url)))));
	}

	let data_str = '';

	// Base_string_data to string
	for (let i = 0; i < base_string_data.length; i++) {
		const {key} = base_string_data[i];
		const {value} = base_string_data[i];
		// Check if the value is an array
		// this means that this key has multiple values
		if (value && Array.isArray(value)) {
			// Sort the array first
			value.sort();

			let valString = '';
			// Serialize all values for this key: e.g. formkey=formvalue1&formkey=formvalue2
			value.forEach((item, i) => {
				valString += key + '=' + item;
				if (i < value.length) {
					valString += '&';
				}
			});
			data_str += valString;
		} else {
			data_str += key + '=' + value + '&';
		}
	}

	// Remove the last character
	data_str = data_str.substr(0, data_str.length - 1);
	return data_str;
};

OAuth.prototype.getSigningKey = function (token_secret) {
	token_secret = token_secret || '';

	if (!this.last_ampersand && !token_secret) {
		return this.percentEncode(this.consumer.secret);
	}

	return this.percentEncode(this.consumer.secret) + '&' + this.percentEncode(token_secret);
};

OAuth.prototype.getBaseUrl = function (url) {
	return url.split('?')[0];
};

OAuth.prototype.deParam = function (string) {
	const arr = string.split('&');
	const data = {};

	for (let i = 0; i < arr.length; i++) {
		const item = arr[i].split('=');

		// '' value
		item[1] = item[1] || '';

		// Check if the key already exists
		// this can occur if the QS part of the url contains duplicate keys like this: ?formkey=formvalue1&formkey=formvalue2
		if (data[item[0]]) {
			// The key exists already
			if (!Array.isArray(data[item[0]])) {
				// Replace the value with an array containing the already present value
				data[item[0]] = [data[item[0]]];
			}

			// And add the new found value to it
			data[item[0]].push(decodeURIComponent(item[1]));
		} else {
			// It doesn't exist, just put the found value in the data object
			data[item[0]] = decodeURIComponent(item[1]);
		}
	}

	return data;
};

OAuth.prototype.deParamUrl = function (url) {
	const tmp = url.split('?');

	if (tmp.length === 1) {
		return {};
	}

	return this.deParam(tmp[1]);
};

OAuth.prototype.percentEncode = function (str) {
	return encodeURIComponent(str)
		.replace(/!/g, '%21')
		.replace(/\*/g, '%2A')
		.replace(/'/g, '%27')
		.replace(/\(/g, '%28')
		.replace(/\)/g, '%29');
};

OAuth.prototype.percentEncodeData = function (data) {
	const result = {};

	Object.keys(data).forEach(key => {
		let value = data[key];
		// Check if the value is an array
		if (value && Array.isArray(value)) {
			const newValue = [];
			// PercentEncode every value
			value.forEach(val => {
				newValue.push(this.percentEncode(val));
			});
			value = newValue;
		} else {
			value = this.percentEncode(value);
		}

		result[this.percentEncode(key)] = value;
	});

	return result;
};

OAuth.prototype.toHeader = function (oauth_data) {
	const sorted = this.sortObject(oauth_data);

	let header_value = 'OAuth ';

	if (this.realm) {
		header_value += 'realm="' + this.realm + '"' + this.parameter_seperator;
	}

	for (let i = 0; i < sorted.length; i++) {
		if (sorted[i].key.indexOf('oauth_') !== 0) {
			continue;
		}

		header_value += this.percentEncode(sorted[i].key) + '="' + this.percentEncode(sorted[i].value) + '"' + this.parameter_seperator;
	}

	return {
		Authorization: header_value.substr(0, header_value.length - this.parameter_seperator.length) // Cut the last chars
	};
};

OAuth.prototype.getNonce = function () {
	const word_characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';

	for (let i = 0; i < this.nonce_length; i++) {
		result += word_characters[parseInt(Math.random() * word_characters.length, 10)];
	}

	return result;
};

OAuth.prototype.getTimeStamp = function () {
	return parseInt(new Date().getTime() / 1000, 10);
};

/// /////////////////// HELPER FUNCTIONS //////////////////////

OAuth.prototype.mergeObject = function (obj1, obj2) {
	obj1 = obj1 || {};
	obj2 = obj2 || {};

	const merged_obj = obj1;
	Object.keys(obj2).forEach(key => {
		merged_obj[key] = obj2[key];
	});
	return merged_obj;
};

OAuth.prototype.sortObject = function (data) {
	const keys = Object.keys(data);
	const result = [];

	keys.sort();

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		result.push({
			key,
			value: data[key]
		});
	}

	return result;
};

module.exports = OAuth;
