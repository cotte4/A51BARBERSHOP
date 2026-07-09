"use server";

import { revalidatePath } from "next/cache";
import { requireOwnerSession, getOwnerSessionContext } from "@/lib/admin-action";
import { computeGoLiveChecks, saveGoLiveSignoff } from "@/lib/go-live-readiness";

export async function signoffGoLiveAction(formData: FormData) {
  if (!(await requireOwnerSession())) {
    throw new Error("No autorizado");
  }

  const owner = await getOwnerSessionContext();
  if (!owner) {
    throw new Error("No autorizado");
  }

  const notes = String(formData.get("notes") ?? "").trim() || null;
  const checks = await computeGoLiveChecks();
  await saveGoLiveSignoff({
    userId: owner.userId,
    notes,
    checks,
  });

  revalidatePath("/negocio/go-live");
}
