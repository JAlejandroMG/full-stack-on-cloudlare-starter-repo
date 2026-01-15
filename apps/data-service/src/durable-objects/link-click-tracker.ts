import { deleteClicksBefore, getRecentClicks } from '@/helpers/durable-queries';
import { DurableObject } from 'cloudflare:workers';
import moment from 'moment';

export class LinkClickTracker extends DurableObject<Env> {
	//* Added
	leastRecentOffsetTime: number = 0;
	mostRecentOffsetTime: number = 0;
	sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		ctx.blockConcurrencyWhile(async () => {
			//* Added
			const [leastRecentOffsetTime, mostRecentOffsetTime] = await Promise.all([
				ctx.storage.get<number>('leastRecentOffsetTime'),
				ctx.storage.get<number>('mostRecentOffsetTime'),
			]);
			//* Added
			this.leastRecentOffsetTime = leastRecentOffsetTime || this.leastRecentOffsetTime;
			this.mostRecentOffsetTime = mostRecentOffsetTime || this.mostRecentOffsetTime;

			this.sql.exec(`
                CREATE TABLE IF NOT EXISTS geo_link_clicks (
                    country TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    time INTEGER NOT NULL
                )
            `);
		});
	}

	async addClick(country: string, latitude: number, longitude: number, time: number) {
		//~ Best Practice would be to abstract this query to an ORM or to another file/method
		this.sql.exec(
			`
            INSERT INTO geo_link_clicks (country, latitude, longitude, time)
            VALUES (?, ?, ?, ?)
            `,
			country,
			latitude,
			longitude,
			time
		);

		//* Added
		const alarm = await this.ctx.storage.getAlarm();
		if (!alarm) await this.ctx.storage.setAlarm(moment().add(2, 'seconds').valueOf());
	}

	//* Added
	async alarm() {
		console.log('Linck cllicked alarm');
		//~ Get the clicks data and the client side connections
		const clicksData = await getRecentClicks(this.sql, this.mostRecentOffsetTime);
		const sockets = this.ctx.getWebSockets();

		//~ Send the data to the client side connections
		for (const socket of sockets) {
			socket.send(JSON.stringify(clicksData.clicks));
		}

		//~ Clean up the data from the DB
		await this.flushOffsetTimes(clicksData.mostRecentTime, clicksData.oldestTime);
		await deleteClicksBefore(this.sql, clicksData.oldestTime);
	}

	//* Added
	async flushOffsetTimes(mostRecentOffsetTime: number, leastRecentOffsetTime: number) {
		this.mostRecentOffsetTime = mostRecentOffsetTime;
		this.leastRecentOffsetTime = leastRecentOffsetTime;
		await this.ctx.storage.put('mostRecentOffsetTime', this.mostRecentOffsetTime);
		await this.ctx.storage.put('leastRecentOffsetTime', this.leastRecentOffsetTime);
	}

	async fetch(_: Request) {
		const webSocketPair = new WebSocketPair();
		const [client, server] = Object.values(webSocketPair);
		//~ This connection as a server WS instance is accepted by the DO
		this.ctx.acceptWebSocket(server);

		//~ With this, the 2 way connection with the client is established
		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void | Promise<void> {
		console.log('Client Closed!');
	}
}
