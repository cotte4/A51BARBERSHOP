import Link from "next/link";
import ConfNavBar from "@/components/configuracion/ConfNavBar";

export default function ConfiguracionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 text-sm mb-2 block"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
        </div>
      </header>

      {/* Nav tabs — client component para active state */}
      <ConfNavBar />

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
