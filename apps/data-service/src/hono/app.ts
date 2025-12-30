import { Hono } from 'hono';

import { getDestinationForCountry, getRoutingDestinations } from '@/helpers/route-ops';
import { cloudflareInfoSchema } from '@repo/data-ops/zod-schema/links';
import { LinkClickMessageType } from '@repo/data-ops/zod-schema/queue';

//~ Regular Hono App
//const App = new Hono();
//~ For Cloudflare to make it available in the worker entry point
export const App = new Hono<{ Bindings: Env }>();

//~ API for Durable Object
App.get('/do/:name', async (c) => {
	//~ This could be done in an API like here,
	//~ or from a Workflow, or from a Queue
	const name = c.req.param('name');
	const doId = c.env.EVALUATION_SCHEDULER.idFromName(name);
	const stub = c.env.EVALUATION_SCHEDULER.get(doId);
	await stub.incrementCount();
	const count = await stub.getCount();

	return c.json({
		count,
	});
});

App.get('/:id', async (c) => {
	//~ Hono make some preprocess to the original Cloudflare request
	//~ so this request is not the same as the one in src/index.ts
	//~ Hono attaches a few different helper methods to make
	//~ working with like cookies and headers really simple
	const id = c.req.param('id');
	const linkInfo = await getRoutingDestinations(c.env, id);

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
	const queueMessage: LinkClickMessageType = {
		data: {
			accountId: linkInfo.accountId,
			country: headers.country,
			destination,
			id,
			latitude: headers.latitude,
			longitude: headers.longitude,
			timestamp: new Date().toISOString(),
		},
		type: 'LINK_CLICK',
	};
	//~ use sendBatch to avoit iterating over several events
	//~ this will make the operation faster and
	//~ will avoid hitting a request limit
	//~ Data will succesfully route to the Queue
	//~ and it will take a few miliseconds
	//~ to get an aknowledgement back from the Queue
	// await c.env.QUEUE.send(queueMessage);

	//~ Cloudflare specific runtime feature which
	//~ allows to run an asynchronous task after
	//~ the request has been fulfilled and avoids
	//~ delaying it, but has up to 30 sec to
	//~ ensure this worker stays running to complete task
	//~ This method isn't 100% fail safe so this is
	//~ not good for really sensible (like financial) data
	c.executionCtx.waitUntil(
		//~ it no longer has to await
		c.env.QUEUE.send(queueMessage)
	);

	return c.redirect(destination);
});
