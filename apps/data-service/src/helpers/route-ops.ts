import { getLink } from '@repo/data-ops/queries/links';
import { linkSchema, LinkSchemaType } from '@repo/data-ops/zod-schema/links';

export function getDestinationForCountry(linkInfo: LinkSchemaType, countryCode?: string) {
	if (!countryCode) {
		return linkInfo.destinations.default;
	}

	if (linkInfo.destinations[countryCode]) {
		return linkInfo.destinations[countryCode];
	}

	return linkInfo.destinations.default;
}

async function getLinkInfoFromKv(env: Env, id: string) {
	//~ Log that get registered in Cloudflare KV Dashnoard
	console.log('CF_KV-DestinationLinks retrieving from cache');
	const linkInfo = await env.CACHE.get(id);

	if (!linkInfo) return null;
	try {
		const parsedLinkInfo = JSON.parse(linkInfo);

		return linkSchema.parse(parsedLinkInfo);
	} catch (error) {
		return null;
	}
}

export async function getRoutingDestinations(env: Env, id: string) {
	//~ Log that get registered in Cloudflare KV Dashnoard
	console.log('CF_KV-DestinationLinks checking cache');
	const linkInfo = await getLinkInfoFromKv(env, id);

	if (linkInfo) return linkInfo;
	const linkInfoFromDb = await getLink(id);

	if (!linkInfoFromDb) return null;
	await saveLinkInfoToKv(env, id, linkInfoFromDb);

	return linkInfoFromDb;
}

const TTL_TIME = 60 * 60 * 24; // 1 day

async function saveLinkInfoToKv(env: Env, id: string, linkInfo: LinkSchemaType) {
	//~ Log that get registered in Cloudflare KV Dashnoard
	console.log('CF_KV-DestinationLinks saving cache');
	try {
		await env.CACHE.put(id, JSON.stringify(linkInfo), {
			expirationTtl: TTL_TIME,
		});
	} catch (error) {
		console.error('Error saving link info to KV:', error);
	}
}
