import { WorkerEntrypoint } from 'cloudflare:workers';

import { App } from './hono/app';
import { handleLinkClick } from './queue-handlers/link-clicks';
import { initDatabase } from '@repo/data-ops/database';
import { QueueMessageSchema } from '@repo/data-ops/zod-schema/queue';
export { DestinationEvaluationWorkflow } from './workflows/destination-evaluation-workflow';

export default class DataService extends WorkerEntrypoint<Env> {
	//* Comment added
	//~ A Workflow is a resource that is triggered along with a Worker,
	//~ therefore, this constructor is not going to be called
	//~ when a Workflow is triggered, so the DB needs to be
	//~ initiated at the Worflow level in destination-evaluation-workflow.ts
	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env);
		initDatabase(env.DB);
	}

	fetch(request: Request) {
		return App.fetch(request, this.env, this.ctx);
	}

	//~ Queue Consumer
	async queue(batch: MessageBatch<unknown>) {
		for (const message of batch.messages) {
			//~ safeParse doesn't throw an error if it fails
			const parsedEvent = QueueMessageSchema.safeParse(message.body);
			if (parsedEvent.success) {
				const event = parsedEvent.data;

				if (event.type === 'LINK_CLICK') {
					await handleLinkClick(this.env, event);
				}
			} else {
				//~ This could be used to send an alert to the system
				console.error(parsedEvent.error);
			}
		}
	}
}
