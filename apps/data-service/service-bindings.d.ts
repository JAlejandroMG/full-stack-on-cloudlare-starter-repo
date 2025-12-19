//~ Because this type is defined in this ts config
//~ this will be accessible throughout the whole project
//~ and then can be used inside destinations-evaluation-workflow.ts
interface DestinationStatusEvaluationParams {
	linkId: string;
	destinationUrl: string;
	accountId: string;
}

interface Env extends Cloudflare.Env {}
