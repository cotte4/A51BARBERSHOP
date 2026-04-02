import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // contiene el code_verifier
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectUri = `${appUrl}/api/spotify/callback`;

  if (error || !code || !state) {
    return Response.redirect(`${appUrl}/pantalla?spotify_error=auth_failed`);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return Response.redirect(`${appUrl}/pantalla?spotify_error=config_missing`);
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
        code_verifier: state, // el verifier viajó como state
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("Spotify token error:", body);
      return Response.redirect(`${appUrl}/pantalla?spotify_error=token_failed`);
    }

    const tokens = (await tokenRes.json()) as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    const params = new URLSearchParams({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: String(tokens.expires_in),
    });

    return Response.redirect(`${appUrl}/pantalla?${params.toString()}`);
  } catch (err) {
    console.error("Spotify callback error:", err);
    return Response.redirect(`${appUrl}/pantalla?spotify_error=unexpected`);
  }
}
