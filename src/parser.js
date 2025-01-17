import PostalMime from 'postal-mime';
import {streamToArrayBuffer} from './utils.js';
import { htmlToText } from 'html-to-text';

/**
 * Parses an email from a raw stream and returns the parsed email object.
 *
 * @param {string} to - The recipient of the email.
 * @param {ReadableStream} raw - The raw stream of the email.
 * @param {number} size - The size of the raw stream in bytes.
 * @returns {Promise<Object>} A Promise that resolves with the parsed email object.
 * @throws {Error} If there is an error parsing the email.
 */
export async function parseEmail(to, raw, size) {
	try {
		// Log the recipient for debugging purposes
		console.debug('parsing email to: ' + to);

		// Convert the raw email data to an ArrayBuffer
		const rawEmail = await streamToArrayBuffer(raw, size);

		// Parse the email content
		const parser = new PostalMime();
		const parsedEmail = await parser.parse(rawEmail);

		// Log the parsed email for debugging purposes
		console.debug('mail parsed: ', parsedEmail);

		// Return the parsed email object
		return parsedEmail;
	} catch (error) {
		// Log the error for debugging purposes
		console.error("parsing email error:", error);
		// Re-throw the error to be handled by the caller
		throw error;
	}
}

/**
 * Generates a plain text content string from a parsed email object.
 *
 * @param {Object} parsedEmail - The parsed email object.
 * @param {string} to - The recipient of the email.
 * @param {string} from - The sender of the email.
 * @returns {string} The generated plain text content string.
 * @throws {Error} If there is an error generating the content.
 */
export function generateContent(parsedEmail, to, from) {
	try {
		// Initialize the message with the recipient and sender
		let msg = `${to} received email from ${from}\nSubject: ${parsedEmail.subject}\n\n`;

		// If the email has a plain text body, append it to the message
		if (parsedEmail.text !== undefined) {
			return msg + parsedEmail.text;
		}

		// If the email has an HTML body, convert it to plain text and append it to the message
		if (parsedEmail.html !== undefined) {
			return msg + htmlToText(parsedEmail.html);
		}

		// If the email has no content, append a default message to the message
		return msg + 'mail has no content';
	} catch (error) {
		// Log the error for debugging purposes
		console.error("generating email content error:", error);
		// Re-throw the error to be handled by the caller
		throw error;
	}
}
