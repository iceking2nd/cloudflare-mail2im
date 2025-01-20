import {getRuleConfig} from "./rule/rule";
import {parseEmail,generateContent} from "./parser";
import {send as sendMessageBySlack} from "./slack/send_message.js";
import {sendAttachments as sendAttachmentsBySlack} from "./slack/send_attachments.js";
import {send as sendMessageByDingTalk, generateDingTalkTextContent} from "./dingtalk/send_message.js";
import {sendAttachments as sendAttachmentsByDingTalk} from "./dingtalk/send_attachments.js";
import {handleAsyncOperation} from "./utils.js";

export default {
	/**
	 * Handles incoming email events.
	 *
	 * @param {Object} event - The email event object.
	 * @param {Object} env - The environment object.
	 * @param {Object} ctx - The context object.
	 */
	async email(event, env, ctx) {
		try {
			// Parse the incoming email
			const parsedEmail = await parseEmail(event.to, event.raw, event.rawSize);
			// Generate content based on the parsed email
			const msg = generateContent(parsedEmail, event.to, event.from);

			// Retrieve rule configuration for the recipient
			const ruleConfig = JSON.parse(await getRuleConfig(env.KV, event.to));
			if (ruleConfig === null) {
				// If no rule configuration is found, reject the email
				await event.setReject('user not found');
				return;
			}

			// Process the email based on the configured IM type
			switch (ruleConfig.im_type) {
				case 'slack':
					// Send the message to Slack
					await handleAsyncOperation(() => sendMessageBySlack(msg, ruleConfig), "Failed to send message to Slack");

					// If there are attachments, send them to Slack
					if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
						await handleAsyncOperation(async () => {
							const res = await sendAttachmentsBySlack(parsedEmail.attachments, ruleConfig);
							const resJson = await res.json();
							console.debug("Slack attachment send result:", JSON.stringify(resJson, null, 2));
							if (!res.ok) {
								throw new Error("Failed to send attachments to Slack");
							}
						}, "Failed to send attachments to Slack");
					}
					break;

				case 'dingtalk':
					// Add DingTalk processing logic here
					await handleAsyncOperation(() => sendMessageByDingTalk(generateDingTalkTextContent(msg,ruleConfig.im_config.keyword), ruleConfig), "Failed to send message to DingTalk")

					if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
						await handleAsyncOperation(async () => {
							const res = await sendAttachmentsByDingTalk(parsedEmail.attachments, env.R2, env.STORAGE_URL_PREFIX, ruleConfig);
							const resJson = await res.json();
							console.debug("DingTalk attachment send result:", JSON.stringify(resJson, null, 2));
							if(!res.ok) {
								throw new Error("Failed to send attachments to DingTalk");
							}
						},"Failed to send attachments to DingTalk")
					}
					break;

				default:
					// If the IM type is not supported, reject the email
					await event.setReject('unsupported im type');
					break;
			}
		} catch (error) {
			// Log any errors that occur during processing
			console.error('Error processing email:', error);
			// Reject the email with an internal error message
			await event.setReject('internal error');
		}
	},

	/**
	 * Handles incoming HTTP fetch requests.
	 *
	 * @param {Request} request - The incoming HTTP request.
	 * @param {Object} env - The environment object.
	 * @param {Object} ctx - The context object.
	 * @returns {Response} The HTTP response.
	 */
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		const id = url.pathname.slice(1).toLowerCase();
		console.debug("file id: ", id)
		const re = new RegExp('^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$')
		if (re.test(id)) {
			const file = await env.R2.get(id);
			if (file) {
				const headers = new Headers();
				headers.set('Content-Type', file.httpMetadata.contentType);
				console.debug("file content type: ", file.httpMetadata.contentType)
				headers.set('Content-Disposition', `attachment; filename="${file.customMetadata.filename}"`);
				console.debug("file content disposition filename: ", file.customMetadata.filename)
				return new Response(file.body, { headers });
			}
		}
		return new Response('Bad request', { status: 400 });
	},
};