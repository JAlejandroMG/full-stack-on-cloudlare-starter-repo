import { Hono } from 'hono';

//~ Regular Hono App
//const App = new Hono();
//~ For Cloudflare to make it available in the worker entry point
export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	return c.json({
		message: 'Hello world',
	});
});
