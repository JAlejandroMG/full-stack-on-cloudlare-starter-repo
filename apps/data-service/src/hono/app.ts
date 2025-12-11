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
	//* Modified
	// const linkInfoFromDb = await getLink(id);
	const linkInfo = await getLink(id);

	//* Added
	if (!linkInfo) {
		//~ It should return a proper 404 page instead of just text
		return c.text('Destination not found', 404);
	}

	//* Added
	const cfHeader = cloudflareInfoSchema.safeParse(c.req.raw.cf);

	//* Added
	if (!cfHeader.success) {
		return c.text('Invalid Cloudflare headers', 404);
	}

	//* Added
	const headers = cfHeader.data;
	//* Added
	const destination = getDestinationForCountry(linkInfo, headers.country);

	//* Removed
	// return c.json(linkInfoFromDb);
	//* Added
	return c.redirect(destination);
});
