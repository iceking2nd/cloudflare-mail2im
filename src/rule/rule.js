import _ from 'lodash';

export async function getRuleConfig(kv_client, destination) {
	try {
		// 获取规则列表
		const ruleList = await kv_client.list();
		console.log('获取到的规则列表:', ruleList);

		// 遍历规则
		for (const rule of _.get(ruleList, 'keys', [])) {
			try {
				// 构建安全的正则表达式
				const re = new RegExp(`^${_.escapeRegExp(rule.name)}$`, 'g');
				console.log('生成的正则表达式:', re);

				// 检查目标地址是否匹配规则
				if (re.test(destination)) {
					console.log('匹配到规则:', rule.name, '目标地址:', destination);

					// 获取对应的规则配置
					const ruleConfig = await kv_client.get(rule.name);
					console.log('获取到的规则配置:', ruleConfig);

					// 找到匹配规则，立即返回
					return ruleConfig;
				}
			} catch (regexError) {
				console.error('创建正则表达式时发生错误:', rule.name, regexError);
			}
		}

		// 如果未找到匹配规则
		console.log('未找到匹配的规则');
		return null;
	} catch (error) {
		console.error('获取规则配置时发生错误:', error);
		throw error;
	}
}
