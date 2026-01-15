// import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
// import { appRouter } from './trpc/router';
// import { createContext } from './trpc/context';
import { initDatabase } from '@repo/data-ops/database';
import { App } from './hono/app';

export default {
	fetch(request, env, ctx) {
		initDatabase(env.DB);
		//* Removed
		// const url = new URL(request.url);

		return App.fetch(request, env, ctx);
		//* Removed
		/*if (url.pathname.startsWith('/trpc')) {
			return fetchRequestHandler({
				endpoint: '/trpc',
				req: request,
				router: appRouter,
				createContext: () =>
					createContext({ req: request, env: env, workerCtx: ctx }),
			});
		}
		return env.ASSETS.fetch(request);*/
	},
} satisfies ExportedHandler<ServiceBindings>;
