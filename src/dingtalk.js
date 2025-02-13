import _ from 'lodash';
import {v4 as uuid} from 'uuid';
const crypto = require('crypto');

export default {
	send: async function(body, config) {
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
	},
	attachments: async function(attachments, r2client, prefix, config) {
		console.debug("attachments list: ", attachments);
		let successed_results = [];
		let failed_results = [];
		for (const attachment of attachments) {
			console.debug("processing attachment: ", attachment.filename, attachment.content.byteLength);
			const id = uuid()
			try {
				await r2client.put(id, attachment.content, {
					httpMetadata: {
						contentType: attachment.mimeType ? attachment.mimeType : "application/octet-stream",
						contentDisposition: `attachment; filename="${attachment.filename}"`,
					},
					customMetadata: {
						"filename": attachment.filename,
						"content-type": attachment.mimeType ? attachment.mimeType : "application/octet-stream",
					},
				});
				successed_results.push({
					"filename": attachment.filename,
					"url": `${prefix}/${id}`,
				})
			} catch (e) {
				console.error(`upload file ${attachment.filename} failed: ${e}`);
				failed_results.push({ "filename": attachment.filename, "error": `upload file failed: ${e}` });
			}
		}

		if (successed_results.length > 0) {
			console.debug("attachments sent: ", successed_results);
			const body = generateAttachmentMessageBody(successed_results, failed_results, config.im_config.keyword)
			return await send(body, config)
		}
	},
	generateTextContent: function(text, keyword) {
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

function generateAttachmentMessageBody(successed_results,failed_results,keyword) {
	let body = {}
	body.msgtype = "actionCard"
	body.actionCard = {
		title: `邮件存在${successed_results.length+failed_results.length}个附件`,
		text: `成功上传${successed_results.length}个附件:\n失败${failed_results.length}个附件\n附件链接存在有效期，请尽快下载……\n\n`,
		btnOrientation: 0,
		btns: []
	}
	for (const attachment of successed_results) {
		body.actionCard.text += `- [${attachment.filename}]\n`
		body.actionCard.btns.push({
			title: attachment.filename,
			actionURL: `dingtalk://dingtalkclient/page/link?url=${encodeURIComponent(attachment.url)}&pc_slide=false`
		})
	}
	for (const attachment of failed_results) {
		body.actionCard.text += `- [${attachment.filename}] 失败\n`
	}
	if (keyword.length > 0) body.actionCard.text += `\n${keyword}`
	return body
}
