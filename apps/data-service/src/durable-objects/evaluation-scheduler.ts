import { DurableObject } from 'cloudflare:workers';

export class EvaluationScheduler extends DurableObject {
	count: number = 0;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.blockConcurrencyWhile(async () => {
			this.count = (await ctx.storage.get('count')) || this.count;
		});
	}

	async incrementCount() {
		this.count++;
		await this.ctx.storage.put('count', this.count);
	}

	async getCount() {
		//~ Not need to go to storage since this is the most updated value
		return this.count;
	}
}
