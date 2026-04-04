import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  let body: { refreshToken?: string };
  try {
    body = (await request.json()) as { refreshToken?: string };
  } catch {
    return Response.json({ error: "Body inválido." }, { status: 400 });
  }

  const { refreshToken } = body;
  if (!refreshToken) {
    return Response.json({ error: "refresh_token requerido." }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.json({ error: "Configuración de Spotify incompleta." }, { status: 500 });
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!tokenRes.ok) {
      return Response.json({ error: "Token inválido o expirado." }, { status: 401 });
    }

    const data = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string; // Spotify puede rotar el refresh token
    };

    return Response.json({
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      // Si Spotify rotó el refresh token, devolvemos el nuevo
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    });
  } catch (err) {
    console.error("Spotify refresh error:", err);
    return Response.json({ error: "Error inesperado al renovar el token." }, { status: 500 });
  }
}
