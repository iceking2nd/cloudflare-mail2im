import { buf2hex } from '../utils';

export async function sendAttachments(attachments,config) {
	console.debug("attachments list: ", attachments)
	let successed_results = [];
	for (const attachment of attachments) {
		console.debug("processing attachment: ", JSON.stringify(attachment));
		console.debug(`attachment length ${typeof attachment.content.byteLength}: `, attachment.content.byteLength);
		const upload_url_response = await getUploadURL(attachment.filename, attachment.content.byteLength, config);
		if (upload_url_response.ok) {
			const upload_url_response_data = await upload_url_response.json();
			console.debug("upload_url_response_data: ", JSON.stringify(upload_url_response_data));
			if (upload_url_response_data.ok === true) {
				const upload_file_response = await uploadFile(upload_url_response_data.upload_url, attachment, config);
				if (upload_file_response.ok) {
					const upload_file_response_data = await upload_file_response.text();
					console.debug("upload_file_response_data: ", JSON.stringify(upload_file_response_data));
					successed_results.push({"id": upload_url_response_data.file_id, "title": attachment.filename});
				} else {
					console.error(`upload file ${attachment.filename} failed: ${upload_file_response.status}`);
				}
			} else {
				console.error(`get upload url for ${attachment.filename} failed: ${upload_url_response_data.error}`);
			}
		} else {
			console.error(`get upload url for ${attachment.filename} failed: ${upload_url_response.status}`);
		}
	}
	if (successed_results.length > 0) {
		console.debug("attachments sent: ", successed_results);
		return await fetch("https://slack.com/api/files.completeUploadExternal",{
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
		})
	}
	return Promise.reject('all attachments upload failed');
}

async function getUploadURL(filename, length, config) {
	return await fetch('https://slack.com/api/files.getUploadURLExternal',{
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
	})
}

async function uploadFile(url, attachment, config) {
	console.debug("upload file to " + url);
	const file = new File([attachment.content], attachment.filename,{type: attachment.type});
	const obj = new FormData();
	obj.append("filename",file);
	return await fetch(url, {
		method: 'POST',
		body: obj,
		headers: {
			'Authorization': `Bearer ${config.im_config.token}`,
		}
	})
}
