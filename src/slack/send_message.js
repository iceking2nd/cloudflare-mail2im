import _ from 'lodash';

export async function send(text,config){
	return new Promise(async (resolve, reject) => {
		if (!(_.isString(config.im_config.token) && _.isString(config.im_config.channel_id) && config.im_config.token.length > 0 && config.im_config.channel_id.length > 0)) {
			reject('invalid im config');
			return;
		}
		console.debug("delivering to slack channel ", config.im_config.channel_id, "with token ", config.im_config.token)

		const response = await fetch('https://slack.com/api/chat.postMessage', {
			method: 'POST',
			body: JSON.stringify({
				channel: config.im_config.channel_id,
				text: text
			}),
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${config.im_config.token}`
			}
		});
		console.debug("slack response: ", response.json());
		resolve();
	})
}
