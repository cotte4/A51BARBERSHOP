import { NextRequest, NextResponse } from "next/server";
import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const { data: session } = await betterFetch<Session>("/api/auth/get-session", {
    baseURL: request.nextUrl.origin,
    headers: {
      cookie: request.headers.get("cookie") || "",
    },
  });

  const isAuthenticated = !!session?.user;
  const userRole = (session?.user as { role?: string })?.role;
  const isMarciano = userRole === "marciano";
  const isAsesor = userRole === "asesor";
  const isMarcianoRoute = pathname === "/marciano" || pathname.startsWith("/marciano/");
  const isMarcianoPublicRoute =
    pathname === "/marciano/login" ||
    pathname.startsWith("/marciano/login") ||
    pathname === "/marciano/registro" ||
    pathname.startsWith("/marciano/registro") ||
    pathname === "/marciano/recuperar" ||
    pathname.startsWith("/marciano/recuperar") ||
    pathname === "/marciano/reset" ||
    pathname.startsWith("/marciano/reset");

  const isAdmin = userRole === "admin";

  if (pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.next();
    }
    if (isMarciano) return NextResponse.redirect(new URL("/marciano", request.url));
    if (isAsesor) return NextResponse.redirect(new URL("/dashboard", request.url));
    if (isAdmin) return NextResponse.redirect(new URL("/hoy", request.url));
    return NextResponse.redirect(new URL("/hoy", request.url));
  }

  if (pathname === "/login" || pathname.startsWith("/login")) {
    if (isAuthenticated) {
      if (isMarciano) return NextResponse.redirect(new URL("/marciano", request.url));
      if (isAsesor) return NextResponse.redirect(new URL("/dashboard", request.url));
      if (isAdmin) return NextResponse.redirect(new URL("/hoy", request.url));
      return NextResponse.redirect(new URL("/hoy", request.url));
    }
    return NextResponse.next();
  }

  if (isMarcianoRoute) {
    if (!isAuthenticated) {
      return isMarcianoPublicRoute
        ? NextResponse.next()
        : NextResponse.redirect(new URL("/marciano/login", request.url));
    }

    if (!isMarciano) {
      return NextResponse.redirect(new URL("/hoy", request.url));
    }

    if (isMarcianoPublicRoute) {
      return NextResponse.redirect(new URL("/marciano", request.url));
    }

    return NextResponse.next();
  }

  if (
    pathname.startsWith("/negocio") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/configuracion") ||
    pathname.startsWith("/liquidaciones") ||
    pathname.startsWith("/inventario") ||
    pathname.startsWith("/repago") ||
    pathname.startsWith("/mi-resultado") ||
    pathname.startsWith("/gastos-rapidos") ||
    pathname.startsWith("/finanzas") ||
    pathname.startsWith("/pantalla")
  ) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isMarciano) {
      return NextResponse.redirect(new URL("/marciano", request.url));
    }
    if (userRole !== "admin" && userRole !== "asesor") {
      return NextResponse.redirect(new URL("/caja", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/hoy")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isMarciano) {
      return NextResponse.redirect(new URL("/marciano", request.url));
    }
    if (isAsesor) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/turnos")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isMarciano) {
      return NextResponse.redirect(new URL("/marciano", request.url));
    }
    if (isAsesor) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/caja")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isMarciano) {
      return NextResponse.redirect(new URL("/marciano", request.url));
    }
    if (isAsesor) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/clientes")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isMarciano) {
      return NextResponse.redirect(new URL("/marciano", request.url));
    }
    if (isAsesor) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/musica")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (isMarciano) {
      return NextResponse.redirect(new URL("/marciano", request.url));
    }
    if (isAsesor) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/hoy/:path*",
    "/negocio/:path*",
    "/login",
    "/dashboard/:path*",
    "/configuracion/:path*",
    "/liquidaciones/:path*",
    "/inventario/:path*",
    "/repago/:path*",
    "/turnos/:path*",
    "/musica/:path*",
    "/mi-resultado/:path*",
    "/gastos-rapidos/:path*",
    "/finanzas/:path*",
    "/pantalla/:path*",
    "/pantalla",
    "/caja/:path*",
    "/clientes/:path*",
    "/marciano/:path*",
  ],
};
