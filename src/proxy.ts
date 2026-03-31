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

  if (pathname === "/") {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (userRole === "admin") {
      return NextResponse.redirect(new URL("/caja", request.url));
    }
    return NextResponse.redirect(new URL("/caja", request.url));
  }

  if (pathname === "/login" || pathname.startsWith("/login")) {
    if (isAuthenticated) {
      if (userRole === "admin") {
        return NextResponse.redirect(new URL("/caja", request.url));
      }
      return NextResponse.redirect(new URL("/caja", request.url));
    }
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/configuracion") ||
    pathname.startsWith("/liquidaciones") ||
    pathname.startsWith("/inventario") ||
    pathname.startsWith("/repago") ||
    pathname.startsWith("/turnos") ||
    pathname.startsWith("/mi-resultado") ||
    pathname.startsWith("/gastos-rapidos")
  ) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (userRole !== "admin") {
      return NextResponse.redirect(new URL("/caja", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/caja")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/clientes")) {
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
    "/repago/:path*",
    "/turnos/:path*",
    "/mi-resultado/:path*",
    "/gastos-rapidos/:path*",
    "/caja/:path*",
    "/clientes/:path*",
  ],
};
