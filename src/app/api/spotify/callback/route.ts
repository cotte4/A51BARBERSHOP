import { NextRequest } from "next/server";
import { decodeAuthState } from "@/lib/spotify-sdk";
import { upsertSpotifyConnection } from "@/lib/music-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/spotify/callback`;
  const authState = state ? decodeAuthState(state) : null;
  const returnTo = authState?.returnTo ?? "/configuracion/musica";

  if (error || !code || !authState) {
    return Response.redirect(`${appUrl}${returnTo}?spotify_error=auth_failed`);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.redirect(`${appUrl}${returnTo}?spotify_error=config_missing`);
  }

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        code_verifier: authState.codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Spotify token error:", body);
      return Response.redirect(`${appUrl}${returnTo}?spotify_error=token_failed`);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    await upsertSpotifyConnection({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    });

    const separator = returnTo.includes("?") ? "&" : "?";
    return Response.redirect(`${appUrl}${returnTo}${separator}spotify_connected=1`);
  } catch (err) {
    console.error("Spotify callback error:", err);
    return Response.redirect(`${appUrl}${returnTo}?spotify_error=unexpected`);
  }
}
