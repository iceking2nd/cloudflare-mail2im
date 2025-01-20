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
