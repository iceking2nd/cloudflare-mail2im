import {getRuleConfig} from "./rule/rule";
import {parseEmail,generateContent} from "./parser";
import {send as sendMessageBySlack} from "./slack/send_message.js";
import {sendAttachments as sendAttachmentsBySlack} from "./slack/send_attachments.js";

export default {
	async email(event, env, ctx) {
		try {
			const parsedEmail = await parseEmail(event.to, event.raw, event.rawSize);
			const msg = generateContent(parsedEmail,event.to,event.from);

			const rule_config = JSON.parse(await getRuleConfig(env.KV, event.to));
			if (rule_config === null) {
				await event.setReject('user not found');
				return;
			}
			switch (rule_config.im_type) {
				case 'slack':
					await sendMessageBySlack(msg, rule_config).catch(async err => {
						console.error("send msg error: ", err)
						throw err;
					});
					if (parsedEmail.attachments && parsedEmail.attachments.length > 0) {
						// 处理附件
						await sendAttachmentsBySlack(parsedEmail.attachments, rule_config).then(async (res) => {
							const res_json = await res.json();
							console.debug("send attachments result: ", JSON.stringify(res_json, null, 2));
							if (!res.ok) {
								throw new Error("send attachments error");
							}
						}).catch(async (err) => {
							console.error("send attachments error: ", err)
							throw err;
						})
					}
					break;

				case 'dingtalk':
					// 在此添加钉钉的处理逻辑
					break;

				default:
					// 不支持的类型
					await event.setReject('unsupported im type');
					break;
			}
		} catch (error) {
			console.error('Error processing email:', error);
			await event.setReject('internal error');
		}
	}
};
