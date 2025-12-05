import { WorkerEntrypoint } from 'cloudflare:workers';
import { App } from './hono/app';
import { initDatabase } from '@repo/data-ops/database';

export default class DataService extends WorkerEntrypoint<Env> {
	//* Added
	constructor(ctx: ExecutionContext, env: Env) {
		super(ctx, env);
		initDatabase(env.DB);
	}

	fetch(request: Request) {
		return App.fetch(request, this.env, this.ctx);
	}
}
