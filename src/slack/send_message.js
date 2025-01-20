import _ from 'lodash';

/**
 * Sends a message to a Slack channel.
 *
 * @param {string} text - The text of the message to be sent.
 * @param {Object} config - Configuration object containing Slack API token and channel ID.
 * @returns {Promise} A Promise that resolves when the message is sent successfully, or rejects if the configuration is invalid or an error occurs.
 */
export async function send(text, config) {
	try {
		// Check if the configuration object contains valid Slack API token and channel ID
		if (!validateConfig(config)) {
			throw new Error('invalid im config');
		}

		// Log the Slack channel ID and API token for debugging purposes
		console.debug("delivering to slack channel ", config.im_config.channel_id, "with token ", config.im_config.token);

		// Send the message to the Slack channel using the Slack API
		const response = await sendMessageToSlack(text, config.im_config.channel_id, config.im_config.token);
		const responseClone = response.clone();

		// Log the response from the Slack API for debugging purposes
		const respJson = await responseClone.json();
		console.debug("slack response: ", respJson);

		// Check if the message was sent successfully
		if (!response.ok) {
			throw new Error(`Failed to send message to Slack: ${response.error}`);
		}

		// Resolve the Promise to indicate that the message was sent successfully
		return response;
	} catch (error) {
		// Log the error for debugging purposes
		console.error("Error sending message to Slack: ", error);
		// Reject the Promise with the error message
		throw error;
	}
}

/**
 * Validates the configuration object.
 *
 * @param {Object} config - Configuration object containing Slack API token and channel ID.
 * @returns {boolean} True if the configuration is valid, false otherwise.
 */
function validateConfig(config) {
	return _.isString(config.im_config.token) &&
		_.isString(config.im_config.channel_id) &&
		config.im_config.token.length > 0 &&
		config.im_config.channel_id.length > 0;
}

/**
 * Sends a message to a Slack channel using the Slack API.
 *
 * @param {string} text - The text of the message to be sent.
 * @param {string} channelId - The ID of the Slack channel to send the message to.
 * @param {string} token - The Slack API token.
 * @returns {Promise} A Promise that resolves with the response from the Slack API.
 */
async function sendMessageToSlack(text, channelId, token) {
	const response = await fetch('https://slack.com/api/chat.postMessage', {
		method: 'POST',
		body: JSON.stringify({
			channel: channelId,
			text: text
		}),
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		}
	});

	return response.json();
}
