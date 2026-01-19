// import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
// import { appRouter } from './trpc/router';
// import { createContext } from './trpc/context';
import { initDatabase } from '@repo/data-ops/database';
import { App } from './hono/app';

export default {
	fetch(request, env, ctx) {
		initDatabase(env.DB);

		return App.fetch(request, env, ctx);
	},
} satisfies ExportedHandler<ServiceBindings>;
