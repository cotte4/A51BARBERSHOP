"use server";

import { revalidatePath } from "next/cache";
import { getAdminActorContext } from "@/lib/dal/authz";
import { saveMarcianoCutsConfig } from "@/lib/marciano-style-service";

export async function saveCutsConfigAction(faceShape: string, formData: FormData): Promise<void> {
  const actor = await getAdminActorContext();
  if (!actor) return;

  const cutsRaw = (formData.get("cutsRaw") as string) ?? "";
  const cuts = cutsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  await saveMarcianoCutsConfig({ faceShape, cuts });

  revalidatePath("/negocio/estilo");
}
