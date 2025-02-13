/**
 * Converts a stream to an ArrayBuffer.
 * @param {ReadableStream} stream - The stream to be converted.
 * @param {number} streamSize - The size of the stream.
 * @returns {Promise<Uint8Array>} - The converted ArrayBuffer.
 * @throws {Error} - If an error occurs while reading the stream.
 */
export async function streamToArrayBuffer(stream, streamSize) {
	try {
		// Create a new Uint8Array with the size of streamSize
		let result = new Uint8Array(streamSize);
		let bytesRead = 0;
		// Get the reader for the stream
		const reader = stream.getReader();
		while (true) {
			// Read the next chunk of the stream
			const { done, value } = await reader.read();
			if (done) {
				break;
			}
			// Set the read value into result
			result.set(value, bytesRead);
			bytesRead += value.length;
		}
		return result;
	} catch (error) {
		// Log and throw the error if it occurs
		console.error('Error reading stream:', error);
		throw error;
	}
}

/**
 * Converts an ArrayBuffer to a Base64 encoded string.
 * @param {ArrayBuffer} arrayBuffer - The ArrayBuffer to be converted.
 * @returns {string} - The Base64 encoded string.
 */
export function base64ArrayBuffer(arrayBuffer) {
	let base64 = '';
	// Base64 encoding table
	let encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

	// Convert ArrayBuffer to Uint8Array
	let bytes = new Uint8Array(arrayBuffer);
	let byteLength = bytes.byteLength;
	// Calculate the remaining bytes
	let byteRemainder = byteLength % 3;
	// Calculate the main length
	let mainLength = byteLength - byteRemainder;

	let a, b, c, d;
	let chunk;

	// Main loop to process chunks of 3 bytes
	for (let i = 0; i < mainLength; i = i + 3) {
		// Combine three bytes into a single integer
		chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

		// Use bitmasks to extract 6-bit segments from the triplet
		a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
		b = (chunk & 258048) >> 12; // 258048 = (2^6 - 1) << 12
		c = (chunk & 4032) >> 6; // 4032 = (2^6 - 1) << 6
		d = chunk & 63; // 63 = 2^6 - 1

		// Convert the raw binary segments to the appropriate ASCII encoding
		base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
	}

	// Handle the remaining bytes and padding
	if (byteRemainder == 1) {
		chunk = bytes[mainLength];

		a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

		// Set the 4 least significant bits to zero
		b = (chunk & 3) << 4; // 3 = 2^2 - 1

		base64 += encodings[a] + encodings[b] + '==';
	} else if (byteRemainder == 2) {
		chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

		a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
		b = (chunk & 1008) >> 4; // 1008 = (2^6 - 1) << 4

		// Set the 2 least significant bits to zero
		c = (chunk & 15) << 2; // 15 = 2^4 - 1

		base64 += encodings[a] + encodings[b] + encodings[c] + '=';
	}

	return base64;
}

/**
 * Converts an ArrayBuffer to a hexadecimal string.
 * @param {ArrayBuffer} buffer - The ArrayBuffer to be converted.
 * @returns {string} - The hexadecimal string.
 */
export function buf2hex(buffer) { // buffer is an ArrayBuffer
																	// Convert ArrayBuffer to Uint8Array
	return [...new Uint8Array(buffer)]
		// Convert each byte to a hexadecimal string and pad to 2 digits
		.map(x => x.toString(16).padStart(2, '0'))
		// Join all the hexadecimal strings
		.join('');
}

// Helper function to handle asynchronous operations with error logging
/**
 * Helper function to handle asynchronous operations with error logging.
 * @param {Function} operation - The asynchronous operation to be performed.
 * @param {string} errorMessage - The error message to be logged if the operation fails.
 */
export async function handleAsyncOperation(operation, errorMessage) {
	try {
		await operation();
	} catch (err) {
		console.error(errorMessage, err);
		throw err;
	}
}
