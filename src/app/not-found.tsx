import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-6">
      <section className="panel-card w-full max-w-md rounded-[28px] p-6 text-center">
        <h1 className="font-display text-3xl font-bold text-white">No encontramos esta página</h1>
        <p className="mt-3 text-sm text-zinc-300">Puede que el link esté viejo o mal escrito.</p>
        <Link
          href="/"
          className="neon-button mt-6 inline-flex min-h-[56px] w-full items-center justify-center rounded-[20px] px-6 text-lg font-semibold"
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
