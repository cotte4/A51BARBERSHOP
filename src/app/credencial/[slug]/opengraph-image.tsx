import { ImageResponse } from "next/og";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      avatarUrl: clients.avatarUrl,
      createdAt: clients.createdAt,
      totalVisits: clients.totalVisits,
      styleProfile: clients.styleProfile,
    })
    .from(clients)
    .where(eq(clients.publicCardSlug, slug))
    .limit(1);

  if (!client) {
    return new ImageResponse(
      <div style={{ background: "#0a0a0a", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#a1a1aa", fontSize: 32 }}>
        Credencial no encontrada
      </div>,
      size
    );
  }

  const alienTitle = client.styleProfile?.dominantStyle ?? "El Intergaláctico";
  const memberYear = client.createdAt.getFullYear();

  let avatarSrc: string | null = null;
  if (client.avatarUrl) {
    try {
      const res = await fetch(client.avatarUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        const b64 = Buffer.from(buf).toString("base64");
        const mime = res.headers.get("content-type") ?? "image/jpeg";
        avatarSrc = `data:${mime};base64,${b64}`;
      }
    } catch {
      // sin avatar — continúa sin imagen
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#09090b",
          border: "8px solid rgba(140,255,89,0.5)",
          padding: "56px 64px",
          justifyContent: "space-between",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 18, letterSpacing: "0.25em", color: "#52525b", textTransform: "uppercase" }}>
            A51 BARBER
          </span>
          <span style={{ fontSize: 18, letterSpacing: "0.25em", color: "#8cff59", textTransform: "uppercase" }}>
            CREDENCIAL MARCIANO
          </span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", alignItems: "center", gap: 56, flex: 1, marginTop: 48 }}>
          {avatarSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={client.name}
              width={220}
              height={220}
              style={{ borderRadius: "50%", border: "4px solid rgba(140,255,89,0.4)", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: 220,
                height: 220,
                borderRadius: "50%",
                border: "3px dashed #3f3f46",
                background: "#18181b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#52525b",
                fontSize: 14,
              }}
            >
              sin avatar
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: 64, fontWeight: 700, color: "#f5f7f5", lineHeight: 1.1 }}>
              {client.name}
            </span>
            <span style={{ fontSize: 36, fontWeight: 600, color: "#8cff59" }}>
              {alienTitle}
            </span>
          </div>
        </div>

        {/* Footer stats */}
        <div
          style={{
            display: "flex",
            gap: 48,
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: 32,
            marginTop: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#71717a", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Miembro desde
            </span>
            <span style={{ fontSize: 24, fontWeight: 600, color: "#f5f7f5" }}>{memberYear}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: "#71717a", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Visitas
            </span>
            <span style={{ fontSize: 24, fontWeight: 600, color: "#f5f7f5" }}>{client.totalVisits}</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    }
  );
}
