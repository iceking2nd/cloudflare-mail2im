import _ from 'lodash';
const crypto = require('crypto');

/**
 * Sends a message to DingTalk.
 *
 * @param {Object} body - The message body object.
 * @param {Object} config - Configuration object containing DingTalk API token and other settings.
 * @returns {Promise} A Promise that resolves when the message is sent successfully, or rejects if the configuration is invalid or an error occurs.
 */
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

/**
 * Validates the configuration object.
 *
 * @param {Object} config - Configuration object containing DingTalk API token and other settings.
 * @returns {boolean} True if the configuration is valid, false otherwise.
 */
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

/**
 * Sends a message to DingTalk using the DingTalk API.
 *
 * @param {Object} body - The message body object.
 * @param {Object} config - Configuration object containing DingTalk API token and other settings.
 * @returns {Promise} A Promise that resolves with the response from the DingTalk API.
 */
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

/**
 * Calculates the signature for the DingTalk API request.
 *
 * @param {string} secret - The secret key for the DingTalk API.
 * @returns {string} The calculated signature.
 */
function calcSign(secret) {
	const timestamp = +new Date();
	const stringToSign = `${timestamp}\n${secret}`;
	const hmac = crypto.createHmac('sha256', secret);
	hmac.update(stringToSign);
	const sign = hmac.digest('base64');
	return encodeURIComponent(sign);
}

/**
 * Generates the text content for DingTalk messages.
 *
 * @param {string} text - The text content of the message.
 * @param {string} keyword - A keyword to be included in the message.
 * @returns {Object} The message body object.
 */
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
