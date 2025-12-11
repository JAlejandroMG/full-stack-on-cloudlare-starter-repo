import { Hono } from 'hono';

import { getLink } from '@repo/data-ops/queries/links';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { getDestinationForCountry } from '@/helpers/route-ops';

//~ Regular Hono App
//const App = new Hono();
//~ For Cloudflare to make it available in the worker entry point
export const App = new Hono<{ Bindings: Env }>();

App.get('/:id', async (c) => {
	//~ Hono make some preprocess to the original Cloudflare request
	//~ so this request is not the same as the one in src/index.ts
	//~ Hono attaches a few different helper methods to make
	//~ working with like cookies and headers really simple
	const id = c.req.param('id');
	const linkInfo = await getLink(id);

	if (!linkInfo) {
		//~ It should return a proper 404 page instead of just text
		return c.text('Destination not found', 404);
	}

	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf);

	if (!cfHeader.success) {
		return c.text('Invalid Cloudflare headers', 404);
	}

	const headers = cfHeader.data;
	const destination = getDestinationForCountry(linkInfo, headers.country);

	return c.redirect(destination);
});
