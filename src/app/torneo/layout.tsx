import type { Metadata } from "next";
import { Barlow_Condensed, Orbitron } from "next/font/google";
import "./torneo.css";

const hud = Orbitron({
  variable: "--font-hud",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

const titulo = Barlow_Condensed({
  variable: "--font-titulo",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Torneo FIFA · A51",
  description: "Torneo presencial de EA SPORTS FC en A51. Anotate y entrá a la cancha.",
};

export default function TorneoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`torneo-theme ${hud.variable} ${titulo.variable}`}>
      <div className="torneo-pitch" aria-hidden="true">
        <svg
          viewBox="0 0 800 800"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          stroke="#8cff59"
          strokeWidth="3"
        >
          <circle cx="400" cy="400" r="150" />
          <circle cx="400" cy="400" r="6" fill="#8cff59" />
          <line x1="0" y1="400" x2="800" y2="400" />
          <rect x="250" y="-4" width="300" height="140" />
          <rect x="250" y="664" width="300" height="140" />
        </svg>
      </div>
      <div className="torneo-scanlines" aria-hidden="true" />
      <div className="torneo-content">{children}</div>
    </div>
  );
}
