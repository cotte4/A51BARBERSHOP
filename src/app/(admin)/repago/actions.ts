"use server";

import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

export async function registrarCuota(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") return;

  const [repago] = await db.select().from(repagoMemas).limit(1);
  if (!repago || repago.pagadoCompleto) return;

  const saldoActual = Number(repago.saldoPendiente ?? 0);
  const cuota = Number(repago.cuotaMensual ?? 0);
  const montoPago = Math.min(cuota, saldoActual);
  const nuevoSaldo = Math.max(0, saldoActual - montoPago);
  const nuevasCuotas = (repago.cuotasPagadas ?? 0) + 1;
  const pagadoCompleto = nuevoSaldo === 0;

  const hoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  await db.insert(repagoMemasCuotas).values({
    numeroCuota: nuevasCuotas,
    fechaPago: hoy,
    montoPagado: String(montoPago),
  });

  await db
    .update(repagoMemas)
    .set({
      cuotasPagadas: nuevasCuotas,
      saldoPendiente: String(nuevoSaldo),
      pagadoCompleto,
    })
    .where(eq(repagoMemas.id, repago.id));

  revalidatePath("/repago");
}
