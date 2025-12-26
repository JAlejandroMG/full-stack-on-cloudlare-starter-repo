import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

import { collectDestinationInfo } from '@/helpers/browser-render';
import { aiDestinationChecker } from '@/helpers/ai-destination-checker';
import { initDatabase } from '@repo/data-ops/database';
import { addEvaluation } from '@repo/data-ops/queries/evaluations';

export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvaluationParams> {
	async run(event: Readonly<WorkflowEvent<DestinationStatusEvaluationParams>>, step: WorkflowStep) {
		//* Added
		initDatabase(this.env.DB);

		//~ Then this subsequently could be used by
		//~ other steps in this workflow
		const collectedData = await step.do('Collect rendered destination page data', async () => {
			return collectDestinationInfo(this.env, event.payload.destinationUrl);
		});

		const aiStatus = await step.do(
			'Use AI to check status of page',
			{
				retries: {
					delay: 0,
					limit: 0,
				},
			},
			async () => {
				return await aiDestinationChecker(this.env, collectedData.bodyText);
			}
		);

		//* Added
		const evaluationId = await step.do('Save evaluation in database', async () => {
			return await addEvaluation({
				accountId: event.payload.accountId,
				destinationUrl: event.payload.destinationUrl,
				linkId: event.payload.linkId,
				reason: aiStatus.statusReason,
				status: aiStatus.status,
			});
		});
	}
}
