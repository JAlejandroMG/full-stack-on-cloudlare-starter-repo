import { DurableObject } from 'cloudflare:workers';
import moment from 'moment';

export class LinkClickTracker extends DurableObject<Env> {
	sql: SqlStorage;

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
		this.sql = ctx.storage.sql;

		ctx.blockConcurrencyWhile(async () => {
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
}
