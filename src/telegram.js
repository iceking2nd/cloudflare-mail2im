import _ from 'lodash';
import { Telegraf } from 'telegraf';
import {v4 as uuid} from 'uuid';
import JSZip from 'jszip';

export default {
	send: async function(text, config) {
		try {
			if (!validateConfig(config)) {
				throw new Error('invalid im config');
			}

			console.debug('delivering to telegram chat ', config.im_config.chat_id, 'with token ', config.im_config.token);
			const bot = new Telegraf(config.im_config.token);
			const response = await bot.telegram.sendMessage(config.im_config.chat_id, text);
			console.debug('telegram response: ', JSON.stringify(response));
			return response;
		} catch (error) {
			// Log the error for debugging purposes
			console.error('Error sending message to telegram: ', error);
			// Reject the Promise with the error message
			throw error;
		}
	},
	attachments: async function(attachments, r2client, prefix, config) {
		console.debug("attachments list: ", attachments);
		const bot = new Telegraf(config.im_config.token);

		try {
			const id = uuid();
			const attachment = await zipAttachments(attachments);
			await r2client.put(id, attachment, {
				httpMetadata: {
					contentType: 'application/zip',
					contentDisposition: 'attachment; filename=attachments.zip',
				},
				customMetadata: {
					"filename": 'attachments.zip',
					"content-type": 'application/zip',
				},
			});
			const response = await bot.telegram.sendDocument(config.im_config.chat_id, `${prefix}/${id}`);
			console.debug('telegram response: ', JSON.stringify(response));
			await r2client.delete(id);
			return Promise.resolve(response);
		} catch (e) {
			console.error(`upload file failed: ${e}`);
		}

	}
};

function validateConfig(config) {
	return _.isString(config.im_config.token) &&
		_.isNumber(config.im_config.chat_id) &&
		config.im_config.token.length > 0 &&
		config.im_config.chat_id > 0;
}

function arrayBufferToStream(arrayBuffer) {
	return new ReadableStream({
		start(controller) {
			controller.enqueue(new Uint8Array(arrayBuffer));
			controller.close();
		}
	});
}

async function zipAttachments(attachments) {
	const zip = new JSZip();
	for (const attachment of attachments) {
		console.debug(`adding ${attachment.filename} ${attachment.content.byteLength} to zip file`);
		zip.file(attachment.filename, attachment.content);
	}
	try {
		const zipContent = await zip.generateAsync({ type: 'arraybuffer' });
		return zipContent;
 	} catch (error) {
		console.error('Error generating zip file:', error);
		throw error;
	}
}
