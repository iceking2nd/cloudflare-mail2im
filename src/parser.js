import PostalMime from 'postal-mime';
import {streamToArrayBuffer} from './utils.js';
import { htmlToText } from 'html-to-text';

export async function parseEmail(to, raw, size) {
	try {
		console.debug('parsing email to: ' + to);
		// 将原始邮件数据转换为 ArrayBuffer
		const rawEmail = await streamToArrayBuffer(raw, size);

		// 解析邮件内容
		const parser = new PostalMime();
		const parsedEmail = await parser.parse(rawEmail);
		console.debug('mail parsed: ', parsedEmail);
		return parsedEmail;
	} catch (error) {
		console.error("parsing email error:", error);
		throw error;
	}
}

export function generateContent(parsedEmail, to, from) {
	try {
		let msg = `${to} received email from ${from}\nSubject: ${parsedEmail.subject}\n\n`;
		if (parsedEmail.text !== undefined) {
			return msg + parsedEmail.text;
		}
		if (parsedEmail.html !== undefined) {
			return msg + htmlToText(parsedEmail.html);
		}
		return msg + 'mail has no content';
	} catch (error) {
		console.error("generating email content error:", error);
		throw error;
	}
}
