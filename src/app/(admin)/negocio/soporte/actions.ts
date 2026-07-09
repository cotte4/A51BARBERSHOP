"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { internalBugReports } from "@/db/schema";
import { requireOwnerSession } from "@/lib/admin-action";

export async function updateBugReportStatusAction(
  bugId: string,
  status: "new" | "triaged" | "fixed" | "verified" | "closed"
) {
  if (!(await requireOwnerSession())) {
    throw new Error("No autorizado");
  }

  await db
    .update(internalBugReports)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(internalBugReports.id, bugId));

  revalidatePath("/negocio/soporte");
}
