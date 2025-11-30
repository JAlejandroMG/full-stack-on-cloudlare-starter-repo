import { nanoid } from "nanoid";

import { getDb } from "@/db/database";
import { links } from "@/drizzle-out/schema";
import { CreateLinkSchemaType } from "@/zod/links";
import { and, desc, eq, gt } from "drizzle-orm";

export async function createLink( data: CreateLinkSchemaType & { accountId: string } ) {
    const db = getDb();
    const id = nanoid(10);

    await db.insert(links).values({
        linkId: id,
        accountId: data.accountId,
        name: data.name,
        destinations: JSON.stringify(data.destinations)
    })

    return id;
}

//* Added
export async function getLinks(accountId: string, createdBefore?: string) {
    const db = getDb();
  
    const conditions = [eq(links.accountId, accountId)];
  
    if (createdBefore) {
      conditions.push(gt(links.created, createdBefore));
    }
  
    const result = await db
      .select({
        linkId: links.linkId,
        destinations: links.destinations,
        created: links.created,
        name: links.name,
      })
      .from(links)
      .where(and(...conditions))
      .orderBy(desc(links.created))
      .limit(25);
  
    return result.map((link) => ({
      ...link,
      lastSixHours: Array.from({ length: 6 }, () =>
        Math.floor(Math.random() * 100),
      ),
      linkClicks: 6,
      destinations: Object.keys(JSON.parse(link.destinations as string)).length,
    }));
  }
