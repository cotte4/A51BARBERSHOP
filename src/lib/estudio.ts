import "server-only";

import { headers } from "next/headers";
import { asc, count, desc, eq } from "drizzle-orm";
import { issueSignedToken, presignUrl } from "@vercel/blob";
import { db } from "@/db";
import { estudioEscuchas, estudioTemas } from "@/db/schema";
import { auth } from "@/lib/auth";

// El Estudio es de Was y Pinky, no de un rol: entra quien esté en ESTUDIO_EMAILS.
export type EstudioActor = { userId: string; email: string };

function emailsPermitidos(): Set<string> {
  return new Set(
    (process.env.ESTUDIO_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function puedeEntrarAlEstudio(email: string | null | undefined): boolean {
  return !!email && emailsPermitidos().has(email.toLowerCase());
}

export async function getEstudioActor(): Promise<EstudioActor | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user;
  if (!user?.id || !puedeEntrarAlEstudio(user.email)) return null;
  return { userId: user.id, email: user.email };
}

export function estudioBlobToken(): string {
  const token = process.env.ESTUDIO_READ_WRITE_TOKEN;
  if (!token) throw new Error("Falta ESTUDIO_READ_WRITE_TOKEN");
  return token;
}

// El link dura lo mismo que una sesión de escucha larga; si alguien lo copia, deja de andar.
const LINK_VALIDO_MS = 6 * 60 * 60 * 1000;

/** Link firmado de solo lectura para un blob privado del Estudio. El CDN resuelve los Range. */
export async function linkFirmado(pathname: string): Promise<string> {
  const firma = await issueSignedToken({
    token: estudioBlobToken(),
    pathname,
    operations: ["get"],
    validUntil: Date.now() + LINK_VALIDO_MS,
  });
  const { presignedUrl } = await presignUrl(firma, { operation: "get", pathname, access: "private" });
  return presignedUrl;
}

export type TemaEstudio = {
  id: string;
  titulo: string;
  genero: string | null;
  duracionSeg: number | null;
  tienePortada: boolean;
  /** Veces que sonó (de los dos), ver src/lib/estudio-lista.ts. */
  escuchas: number;
};

export async function listarTemas(): Promise<TemaEstudio[]> {
  const filas = await db
    .select({
      id: estudioTemas.id,
      titulo: estudioTemas.titulo,
      genero: estudioTemas.genero,
      duracionSeg: estudioTemas.duracionSeg,
      portadaPathname: estudioTemas.portadaPathname,
      escuchas: count(estudioEscuchas.id),
    })
    .from(estudioTemas)
    .leftJoin(estudioEscuchas, eq(estudioEscuchas.temaId, estudioTemas.id))
    .groupBy(estudioTemas.id)
    // El orden del ranking; a igual puesto, el más nuevo primero.
    .orderBy(asc(estudioTemas.orden), desc(estudioTemas.createdAt));

  return filas.map(({ portadaPathname, ...tema }) => ({ ...tema, tienePortada: !!portadaPathname }));
}
