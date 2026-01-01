import moment from 'moment';
import { DurableObject } from 'cloudflare:workers';

interface ClickData {
	accountId: string;
	linkId: string;
	destinationUrl: string;
	destinationCountryCode: string;
}

export class EvaluationScheduler extends DurableObject<Env> {
	clickData: ClickData | undefined;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.blockConcurrencyWhile(async () => {
			this.clickData = await ctx.storage.get<ClickData>('click_data');
		});
	}

	async collectLinkClick(accountId: string, destinationCountryCode: string, destinationUrl: string, linkId: string) {
		this.clickData = {
			accountId,
			destinationCountryCode,
			destinationUrl,
			linkId,
		};

		await this.ctx.storage.put('click_data', this.clickData);
		//~ This would run on every single click
		//~ which would be very expensive and unnecessary
		// this.env.DESTINATION_EVALUATION_WORKFLOW.create();
		//~ Instead we would use an Alarm which woud be a number or null
		//~ and if null, means no alarm has been set for this Durable Object
		const alarm = await this.ctx.storage.getAlarm();

		if (!alarm) {
			//~ This logic to control how often this DO is triggered
			//+ independently of how many people around the world click this link
			//+ the DO will run the evaluation once every 24 hours the most
			const periodDelay = moment().add(24, 'hours').valueOf();
			await this.ctx.storage.setAlarm(periodDelay);
		}
	}

	//~ This alarm will trigger 10 seconds into the future
	// async alarm(alarmInfo?: AlarmInvocationInfo): void | Promise<void> {
	async alarm() {
		console.log('Evaluation scheduler alarm triggered');
		const clickData = this.clickData;

		//~ In production send this error to a tracing system (Posthog)
		if (!clickData) throw new Error('Click data not set');

		//~ This runs the Workflow that checks if a webpage is healthy
		await this.env.DESTINATION_EVALUATION_WORKFLOW.create({
			params: {
				accountId: clickData.accountId,
				destinationUrl: clickData.destinationUrl,
				linkId: clickData.linkId,
			},
		});
	}
}
