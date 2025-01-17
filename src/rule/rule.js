import _ from 'lodash';

/**
 * Retrieves the rule configuration for a given destination address from a KV client.
 *
 * @param {Object} kv_client - The KV client to interact with the key-value store.
 * @param {string} destination - The destination address to match against the rules.
 * @returns {Promise<Object|null>} A Promise that resolves to the rule configuration if a match is found, or null if no match is found.
 * @throws {Error} If an error occurs while obtaining the rule configuration.
 */
export async function getRuleConfig(kv_client, destination) {
	try {
		// Get the rule list
		const ruleList = await kv_client.list();
		console.log('Obtained rule list:', ruleList);

		// Traverse the rules
		for (const rule of _.get(ruleList, 'keys', [])) {
			try {
				// Build a regular expression
				const re = new RegExp(`^${rule.name}$`, 'g');
				console.log('Generated regular expression:', re);

				// Check if the destination address matches the rule
				if (re.test(destination)) {
					console.log('Matched rule:', rule.name, 'Destination address:', destination);

					// Get the corresponding rule configuration
					const ruleConfig = await kv_client.get(rule.name);
					console.log('Obtained rule configuration:', ruleConfig);

					// Found a matching rule, return immediately
					return ruleConfig;
				}
			} catch (regexError) {
				console.error('Error occurred while creating regular expression:', rule.name, regexError);
			}
		}

		// If no matching rule is found
		console.log('No matching rule found');
		return null;
	} catch (error) {
		console.error('Error occurred while obtaining rule configuration:', error);
		throw error;
	}
}
