import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";

const PUBLIC_RESERVA_COOKIE_PREFIX = "a51_public_reserva_";
const PUBLIC_RESERVA_PASSWORD_PREFIX = "scrypt";
const PUBLIC_RESERVA_PASSWORD_KEYLEN = 32;
const PUBLIC_RESERVA_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type PublicReservaBarberoAccess = {
  publicSlug: string | null;
  publicReservaPasswordHash: string | null;
};

function getSigningSecret() {
  return process.env.BETTER_AUTH_SECRET || "a51-public-reserva-dev-secret";
}

function safeCompare(value: string, expected: string) {
  const left = Buffer.from(value);
  const right = Buffer.from(expected);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function normalizePublicReservaSlug(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function hashPublicReservaPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, PUBLIC_RESERVA_PASSWORD_KEYLEN).toString("hex");
  return `${PUBLIC_RESERVA_PASSWORD_PREFIX}:${salt}:${hash}`;
}

export function verifyPublicReservaPassword(password: string, storedHash: string) {
  const [scheme, salt, expectedHash] = storedHash.split(":");

  if (scheme !== PUBLIC_RESERVA_PASSWORD_PREFIX || !salt || !expectedHash) {
    return false;
  }

  const actualHash = scryptSync(password, salt, PUBLIC_RESERVA_PASSWORD_KEYLEN).toString("hex");
  return safeCompare(actualHash, expectedHash);
}

export function getPublicReservaCookieName(slug: string) {
  return `${PUBLIC_RESERVA_COOKIE_PREFIX}${slug}`;
}

function buildPublicReservaCookieValue(slug: string, passwordHash: string) {
  return createHmac("sha256", getSigningSecret())
    .update(`${slug}:${passwordHash}`)
    .digest("hex");
}

export async function grantPublicReservaAccess(slug: string, passwordHash: string) {
  const cookieStore = await cookies();
  cookieStore.set(getPublicReservaCookieName(slug), buildPublicReservaCookieValue(slug, passwordHash), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PUBLIC_RESERVA_COOKIE_MAX_AGE,
  });
}

export async function hasPublicReservaCookieAccess(slug: string, passwordHash: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get(getPublicReservaCookieName(slug))?.value;

  if (!token) {
    return false;
  }

  return safeCompare(token, buildPublicReservaCookieValue(slug, passwordHash));
}

export async function hasAuthenticatedReservaAccess() {
  const session = await auth.api.getSession({ headers: await headers() });
  return Boolean(session?.user?.id);
}

export async function canAccessPublicReserva(barbero: PublicReservaBarberoAccess) {
  if (!barbero.publicSlug) {
    return false;
  }

  if (!barbero.publicReservaPasswordHash) {
    return true;
  }

  if (await hasAuthenticatedReservaAccess()) {
    return true;
  }

  return hasPublicReservaCookieAccess(barbero.publicSlug, barbero.publicReservaPasswordHash);
}
