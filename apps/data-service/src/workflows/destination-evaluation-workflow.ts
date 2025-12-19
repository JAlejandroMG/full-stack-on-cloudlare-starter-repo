import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from 'cloudflare:workers';
import { collectDestinationInfo } from '@/helpers/browser-render';

export class DestinationEvaluationWorkflow extends WorkflowEntrypoint<Env, DestinationStatusEvaluationParams> {
	async run(event: Readonly<WorkflowEvent<DestinationStatusEvaluationParams>>, step: WorkflowStep) {
		const collectedData = await step.do('Collect rendered destination page data', async () => {
			//* Removed
			// console.log('Collecting rendered destination page data');

			//* Removed
			/*return {
				dummydata: 'dummydata',
			};*/
			//* Added
			return collectDestinationInfo(this.env, event.payload.destinationUrl);
		});

		//~ Then this subsequently could be used by
		//~ other steps in this workflow
		console.log(collectedData);
	}
}
