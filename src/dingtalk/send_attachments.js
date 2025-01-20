/**
 * Sends a list of attachments to DingTalk.
 *
 * @param {Array} attachments - An array of attachment objects to be sent.
 * @param {Object} r2client - R2 client for uploading files.
 * @param {string} prefix - The prefix URL for the uploaded files.
 * @param {Object} config - Configuration object containing DingTalk API token and other settings.
 * @returns {Promise} A Promise that resolves when the attachments are sent successfully, or rejects if all uploads fail.
 */
import { send } from './send_message';

const uuid = require("uuid");
export async function sendAttachments(attachments, r2client, prefix, config) {
	console.debug("attachments list: ", attachments);
	let successed_results = [];
	let failed_results = [];
	for (const attachment of attachments) {
		console.debug("processing attachment: ", attachment.filename, attachment.content.byteLength);
		const id = uuid.v4()
		try {
			await r2client.put(id, attachment.content, {
				httpMetadata: {
					contentType: attachment.mimeType ? attachment.mimeType : "application/octet-stream",
					contentDisposition: `attachment; filename="${attachment.filename}"`,
				},
				customMetadata: {
					"filename": attachment.filename,
					"content-type": attachment.mimeType? attachment.mimeType : "application/octet-stream",
				},
			});
			successed_results.push({
				"filename": attachment.filename,
				"url":`${prefix}/${id}`,
			})
		} catch (e) {
			console.error(`upload file ${attachment.filename} failed: ${e}`);
			failed_results.push({ "filename": attachment.filename, "error": `upload file failed: ${e}` });
		}
	}

	if (successed_results.length > 0) {
		console.debug("attachments sent: ", successed_results);
		const body = generateAttachmentMessageBody(successed_results,failed_results,config.im_config.keyword)
		return await send(body, config)
	}
}

/**
 * Generates the message body for attachments in DingTalk.
 *
 * @param {Array} successed_results - An array of successfully uploaded attachments.
 * @param {Array} failed_results - An array of failed attachments.
 * @param {string} keyword - A keyword to be included in the message.
 * @returns {Object} The message body object.
 */
function generateAttachmentMessageBody(successed_results, failed_results, keyword) {
	let body = {}
	body.msgtype = "actionCard"
	body.actionCard = {
		title: `${successed_results.length + failed_results.length} attachments in the email`,
		text: `Successfully uploaded ${successed_results.length} attachments:\nFailed to upload ${failed_results.length} attachments\nAttachment links have an expiration date, please download them as soon as possible...\n\n`,
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
		body.actionCard.text += `- [${attachment.filename}] failed\n`
	}
	if (keyword.length > 0) body.actionCard.text += `\n${keyword}`
	return body
}
