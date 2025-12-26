import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';

import { collectDestinationInfo } from '@/helpers/browser-render';
import { aiDestinationChecker } from '@/helpers/ai-destination-checker';
import { initDatabase } from '@repo/data-ops/database';
import { addEvaluation } from '@repo/data-ops/queries/evaluations';

export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvaluationParams> {
	async run(event: Readonly<WorkflowEvent<DestinationStatusEvaluationParams>>, step: WorkflowStep) {
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

		const evaluationId = await step.do('Save evaluation in database', async () => {
			return await addEvaluation({
				accountId: event.payload.accountId,
				destinationUrl: event.payload.destinationUrl,
				linkId: event.payload.linkId,
				reason: aiStatus.statusReason,
				status: aiStatus.status,
			});
		});

		await step.do('Backup destination HTML in R2', async () => {
			const accountId = event.payload.accountId;
			//~ An extension could be added to the file where the data is going to be stored
			const r2PathHtml = `evaluations/${accountId}/html/${evaluationId}`;
			const r2PathBodyText = `evaluations/${accountId}/body-text/${evaluationId}`;
			await this.env.BUCKET.put(r2PathHtml, collectedData.html);
			await this.env.BUCKET.put(r2PathBodyText, collectedData.bodyText);
		});
	}
}
