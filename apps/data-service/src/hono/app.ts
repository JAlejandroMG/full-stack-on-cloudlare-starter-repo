import { Hono } from 'hono';

//~ Regular Hono App
//const App = new Hono();
//~ For Cloudflare to make it available in the worker entry point
export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	//~ Hono make some preprocess to the original Cloudflare request
	//~ so this request is not the same as the one in src/index.ts
	//~ Hono attaches a few different helper methods to make
	//~ working with like cookies and headers really simple
	// console.log(JSON.stringify(c.req.raw.cf));
	const cf = c.req.raw.cf;
	const country = cf?.country;
	const lat = cf?.latitude;
	const long = cf?.longitude;

	return c.json({
		country,
		lat,
		long,
	});
});
