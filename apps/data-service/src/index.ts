import { WorkerEntrypoint } from 'cloudflare:workers';
import { App } from './hono/app';

export default class DataService extends WorkerEntrypoint<Env> {
	fetch(request: Request) {
		//* Removed
		// return new Response('Hello World!');
		return App.fetch(request, this.env, this.ctx);
	}
}
