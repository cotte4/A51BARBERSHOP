export const runtime = "edge";

import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const SHAPE_LABELS: Record<string, string> = {
  oval: "Ovalado",
  cuadrado: "Cuadrado fuerte",
  redondo: "Redondo",
  corazon: "Corazón",
  diamante: "Diamante",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  await params; // consume params (clientId used for auth context only — not needed for MVP)

  const { searchParams } = request.nextUrl;
  const style = searchParams.get("style") ?? "Marciano";
  const shape = searchParams.get("shape") ?? "";
  const cuts = (searchParams.get("cuts") ?? "").split(",").filter(Boolean);
  const time = searchParams.get("time") ?? "45";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          background:
            "radial-gradient(circle at 20% 20%, rgba(140,255,89,0.15) 0%, #000 50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          fontFamily: "serif",
          gap: "32px",
        }}
      >
        {/* Logo */}
        <div
          style={{
            color: "white",
            fontSize: 80,
            fontWeight: 700,
            letterSpacing: "-2px",
          }}
        >
          A51
        </div>

        {/* Eyebrow */}
        <div
          style={{
            color: "#6b7280",
            fontSize: 24,
            letterSpacing: "8px",
            textTransform: "uppercase",
          }}
        >
          PERFIL MARCIANO
        </div>

        {/* Dominant style */}
        <div
          style={{
            color: "#8cff59",
            fontSize: 120,
            fontWeight: 700,
            textAlign: "center",
            lineHeight: 1,
          }}
        >
          {style}
        </div>

        {/* Face shape */}
        {shape ? (
          <div style={{ color: "white", fontSize: 36, opacity: 0.7 }}>
            {SHAPE_LABELS[shape] ?? shape}
          </div>
        ) : null}

        {/* Time in chair */}
        <div
          style={{
            color: "#6b7280",
            fontSize: 28,
          }}
        >
          {time} min en silla
        </div>

        {/* Recommended cuts */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: "100%",
          }}
        >
          {cuts.slice(0, 3).map((cut, i) => (
            <div
              key={i}
              style={{
                color: "white",
                fontSize: 32,
                padding: "16px 32px",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 24,
              }}
            >
              · {cut}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            color: "#6b7280",
            fontSize: 24,
            letterSpacing: "4px",
            marginTop: 40,
          }}
        >
          a51barber.com
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}
