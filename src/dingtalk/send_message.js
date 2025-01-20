import _ from 'lodash';
const crypto = require('crypto');

export async function send(body, config) {
	try {
		if (!validateConfig(config)) {
			throw new Error('invalid im config');
		}
		console.debug("delivering to dingtalk with config: ", JSON.stringify(config));
		const response = await sendMessageToDingTalk(body, config.im_config);
		const responseClone = response.clone();
		const resJson = await responseClone.json();
		console.debug("dingtalk response: ", resJson);
		if (!response.ok) {
			throw new Error(`Failed to send message to DingTalk: ${response.error}`);
		}
		return response;
	}catch (error) {
		console.error("Error sending message to DingTalk: ", error);
		throw error;
	}
}

function validateConfig(config) {
	if (!_.isObject(config)) {
		console.debug('config is not an object')
		return false;
	}
	if (!_.isString(config.im_config.token)) {
		console.debug('token is not a string')
		return false;
	}
	if (config.im_config.token.length <= 0) {
		console.debug('token is empty')
		return false;
	}
	return !(config.im_config.secret.length <= 0 && config.im_config.keyword.length <= 0);
}

async function sendMessageToDingTalk(body, config) {
	let url = `https://oapi.dingtalk.com/robot/send?access_token=${config.token}`;
	if (_.isString(config.secret) && config.secret.length > 0) {
		url += `&timestamp=${+new Date()}&sign=${calcSign(config.secret)}`;
	}
	console.debug("robot url: ", url);
	return await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});
}

function calcSign(secret) {
	const timestamp = +new Date();
	const stringToSign = `${timestamp}\n${secret}`;
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(stringToSign);
	const sign = hmac.digest('base64');
	return encodeURIComponent(sign);
}

export function generateDingTalkTextContent(text, keyword){
	console.debug("generating dingtalk text content")
	console.debug("text: ",text)
	console.debug("keyword: ",keyword)
	let body = {
		msgtype: 'text',
		text: {
			content: text,
		},
	};
	if (_.isString(keyword) && keyword.length > 0) {
		body.text.content = `${body.text.content}${keyword}`;
	}
	return body;
}
