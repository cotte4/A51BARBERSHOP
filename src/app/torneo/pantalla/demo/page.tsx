import type { Metadata } from "next";
import Demo from "./_Demo";

export const metadata: Metadata = {
  title: "Torneo A51 · Ensayo",
  robots: { index: false },
};

export default function DemoPage() {
  return <Demo />;
}
