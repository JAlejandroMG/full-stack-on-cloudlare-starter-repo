//~ Because this type is defined in this ts config
//~ this will be accessible throughout the whole project
//~ and then can be used inside destinations-evaluation-workflow.ts
//* Modified
interface DestinationStatusEvaluationParams {
	accountId: string;
	destinationUrl: string;
	linkId: string;
}

interface Env extends Cloudflare.Env {
	//* Added
	//~ To typesafe the params when triggering the Workflow
	DESTINATION_EVALUATION_WORKFLOW: Workflow<DestinationStatusEvaluationParams>;
}
