import { z } from "zod";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

async function getClientCredentialsToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Configuracion de Spotify incompleta.");
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("No pude autenticar contra Spotify.");
  }

  const tokenData = (await tokenRes.json()) as { access_token: string };
  return tokenData.access_token;
}

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q"),
  });

  if (!parsed.success) {
    return Response.json({ error: "Busqueda invalida." }, { status: 400 });
  }

  try {
    const accessToken = await getClientCredentialsToken();
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(parsed.data.q)}&type=track&limit=6`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      }
    );

    if (!searchRes.ok) {
      return Response.json({ error: "No pude buscar canciones en Spotify." }, { status: 502 });
    }

    const searchData = (await searchRes.json()) as {
      tracks?: {
        items?: Array<{
          id: string;
          uri: string;
          name: string;
          artists: Array<{ name: string }>;
          album: {
            name: string;
            images: Array<{ url: string }>;
          };
        }>;
      };
    };

    return Response.json(
      {
        tracks: (searchData.tracks?.items ?? []).map((track) => ({
          id: track.id,
          uri: track.uri,
          name: track.name,
          artistNames: track.artists.map((artist) => artist.name),
          albumName: track.album.name,
          imageUrl: track.album.images[0]?.url ?? "",
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Spotify public search error:", error);
    return Response.json({ error: "No pude buscar canciones en Spotify." }, { status: 500 });
  }
}
