/**
 * Sends a list of attachments to Slack.
 *
 * @param {Array} attachments - An array of attachment objects to be sent.
 * @param {Object} config - Configuration object containing Slack API token and channel ID.
 * @returns {Promise} A Promise that resolves when the attachments are sent successfully, or rejects if all uploads fail.
 */
export async function sendAttachments(attachments, config) {
	console.debug("attachments list: ", attachments);
	let successed_results = [];
	let failed_results = [];

	// Iterate over each attachment in the list
	for (const attachment of attachments) {
		console.debug("processing attachment: ", attachment.filename, attachment.content.byteLength);

		// Get the upload URL for the attachment
		const upload_url_response = await getUploadURL(attachment.filename, attachment.content.byteLength, config);

		if (!upload_url_response.ok) {
			console.error(`get upload url for ${attachment.filename} failed: ${upload_url_response.status}`);
			failed_results.push({ "filename": attachment.filename, "error": `get upload url failed: ${upload_url_response.status}` });
			continue;
		}

		const upload_url_response_data = await upload_url_response.json();

		if (upload_url_response_data.ok !== true) {
			console.error(`get upload url for ${attachment.filename} failed: ${upload_url_response_data.error}`);
			failed_results.push({ "filename": attachment.filename, "error": `get upload url failed: ${upload_url_response_data.error}` });
			continue;
		}

		// Upload the file to the obtained URL
		const upload_file_response = await uploadFile(upload_url_response_data.upload_url, attachment, config);

		if (!upload_file_response.ok) {
			console.error(`upload file ${attachment.filename} failed: ${upload_file_response.status}`);
			failed_results.push({ "filename": attachment.filename, "error": `upload file failed: ${upload_file_response.status}` });
			continue;
		}

		const upload_file_response_data = await upload_file_response.text();
		console.debug("upload_file_response_data: ", upload_file_response_data);
		// Add the successfully uploaded file to the results list
		successed_results.push({ "id": upload_url_response_data.file_id, "title": attachment.filename });
	}

	// If there are successful uploads, complete the external upload
	if (successed_results.length > 0) {
		console.debug("attachments sent: ", successed_results);
		return await fetch("https://slack.com/api/files.completeUploadExternal", {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${config.im_config.token}`
			},
			body: JSON.stringify({
				token: config.im_config.token,
				files: successed_results,
				channel_id: config.im_config.channel_id
			})
		});
	}

	// If all uploads failed, reject the Promise with detailed information
	return Promise.reject({ "message": "all attachments upload failed", "failed_results": failed_results });
}

/**
 * Retrieves the upload URL for a file from Slack.
 *
 * @param {string} filename - The name of the file to be uploaded.
 * @param {number} length - The length of the file in bytes.
 * @param {Object} config - Configuration object containing Slack API token.
 * @returns {Promise} A Promise that resolves with the response from the Slack API.
 */
async function getUploadURL(filename, length, config) {
	return await fetch('https://slack.com/api/files.getUploadURLExternal', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': `Bearer ${config.im_config.token}`
		},
		body: new URLSearchParams({
			filename: filename,
			token: config.im_config.token,
			length: length
		})
	});
}

/**
 * Uploads a file to a given URL.
 *
 * @param {string} url - The URL to upload the file to.
 * @param {Object} attachment - The attachment object containing the file content and metadata.
 * @param {Object} config - Configuration object containing Slack API token.
 * @returns {Promise} A Promise that resolves with the response from the upload request.
 */
async function uploadFile(url, attachment, config) {
	console.debug("upload file to " + url);
	const file = new File([attachment.content], attachment.filename, { type: attachment.type });
	const obj = new FormData();
	obj.append("filename", file);
	return await fetch(url, {
		method: 'POST',
		body: obj,
		headers: {
			'Authorization': `Bearer ${config.im_config.token}`,
		}
	});
}
