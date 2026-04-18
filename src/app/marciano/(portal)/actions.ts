"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

export async function generateCardSlugAction(): Promise<
  { success: true; slug: string } | { success: false; error: string }
> {
  const { client } = await requireMarcianoClient();

  const [current] = await db
    .select({ publicCardSlug: clients.publicCardSlug })
    .from(clients)
    .where(eq(clients.id, client.id))
    .limit(1);

  if (current?.publicCardSlug) {
    return { success: true, slug: current.publicCardSlug };
  }

  const slug = generateSlug();
  await db.update(clients).set({ publicCardSlug: slug }).where(eq(clients.id, client.id));
  return { success: true, slug };
}
