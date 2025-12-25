import { generateObject } from 'ai';
import { createWorkersAI } from 'workers-ai-provider';
import { z } from 'zod';

export async function aiDestinationChecker(env: Env, bodyText: string) {
	const workerAi = createWorkersAI({ binding: env.AI });
	const result = await generateObject({
		mode: 'json',
		model: workerAi('@cf/meta/llama-3-8b-instruct'),
		prompt: `Is this product available for purchase? ${bodyText}`,
		system:
			`You are an AI assistant for ecommerce analysis. Your job is to determine if the product on a webpage is available, not available, or if its status is unclear, based solely on the provided text. Be concise and base your reasoning on specific evidence from the content. Do not guess if information is insufficient.
			`.trim(),
		schema: z
			.object({
				pageStatus: z
					.object({
						status: z.enum(['AVAILABLE_PRODUCT', 'NOT_AVAILABLE_PRODUCT', 'UNKNOWN_STATUS'], {
							description: `
								Indicates the product's availability on the page:
								- AVAILABLE_PRODUCT: The product appears available for purchase.
								- NOT_AVAILABLE_PRODUCT: The product appears unavailable (sold out, discontinued, etc.).
								- UNKNOWN_STATUS: The status could not be determined from the text.
								`.trim(),
						}),
						statusReason: z.string().describe(
							`A concise explanation citing specific words, phrases, or patterns from the content that led to this status. If status is UNKNOWN_STATUS, explain what was missing or ambiguous.
							`.trim()
						),
					})
					.describe('Information about the product availability status determined from the webpage content.'),
			})
			.describe('The result object returned by the assistant.'),
	});

	return {
		status: result.object.pageStatus.status,
		statusReason: result.object.pageStatus.statusReason,
	};
}
