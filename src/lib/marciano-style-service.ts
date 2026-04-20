import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marcianoCutsConfig } from "@/db/schema";

export async function saveMarcianoCutsConfig(input: {
  faceShape: string;
  cuts: string[];
}): Promise<void> {
  if (input.cuts.length === 0) {
    await db
      .delete(marcianoCutsConfig)
      .where(eq(marcianoCutsConfig.faceShape, input.faceShape));
    return;
  }

  await db
    .insert(marcianoCutsConfig)
    .values({
      faceShape: input.faceShape,
      cuts: input.cuts,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marcianoCutsConfig.faceShape,
      set: {
        cuts: input.cuts,
        updatedAt: new Date(),
      },
    });
}
