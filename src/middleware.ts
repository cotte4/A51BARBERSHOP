import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obtener sesión desde la API de Better Auth
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
    }
  );

  const isAuthenticated = !!session?.user;
  const userRole = (session?.user as { role?: string })?.role;

  // ————————————————————————————
  // Ruta raíz: redirigir según rol
  // ————————————————————————————
  if (pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/caja", request.url));
  }

  // ————————————————————————————
  // /login: si ya tiene sesión, redirigir según rol
  // ————————————————————————————
  if (pathname === "/login" || pathname.startsWith("/login")) {
    if (isAuthenticated) {
      if (userRole === "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/caja", request.url));
    }
    return NextResponse.next();
  }

  // ————————————————————————————
  // Rutas admin: solo rol admin
  // ————————————————————————————
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/configuracion") ||
    pathname.startsWith("/liquidaciones") ||
    pathname.startsWith("/inventario")
  ) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (userRole !== "admin") {
      // Barbero intenta entrar a zona admin → redirigir a /caja
      return NextResponse.redirect(new URL("/caja", request.url));
    }
    return NextResponse.next();
  }

  // ————————————————————————————
  // Rutas barbero: admin y barbero pueden entrar
  // ————————————————————————————
  if (pathname.startsWith("/caja")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/dashboard/:path*",
    "/configuracion/:path*",
    "/liquidaciones/:path*",
    "/inventario/:path*",
    "/caja/:path*",
  ],
};
