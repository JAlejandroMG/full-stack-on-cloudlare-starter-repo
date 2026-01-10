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

	//- This is not really needed, just to see the data in the browser
	async fetch(_: Request) {
		const query = `
            SELECT *
            FROM geo_link_clicks
            limit 100
        `;

		const cursor = this.sql.exec(query);
		const results = cursor.toArray();

		return new Response(
			JSON.stringify({
				clicks: results,
			}),
			{
				headers: {
					'Content-Type': 'application/json',
				},
			}
		);
	}
}
