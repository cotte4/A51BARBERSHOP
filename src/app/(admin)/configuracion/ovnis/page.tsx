import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productos, servicios } from "@/db/schema";
import { auth } from "@/lib/auth";
import OvnisValueEditor from "./_OvnisValueEditor";

export default async function ConfiguracionOvnisPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin" && role !== "asesor") redirect("/caja");

  const [listaServicios, listaProductos] = await Promise.all([
    db
      .select({ id: servicios.id, nombre: servicios.nombre, ovnisValue: servicios.ovnisValue })
      .from(servicios)
      .where(eq(servicios.activo, true))
      .orderBy(servicios.nombre),
    db
      .select({
        id: productos.id,
        nombre: productos.nombre,
        ovnisValue: productos.ovnisValue,
        esConsumicion: productos.esConsumicion,
      })
      .from(productos)
      .where(eq(productos.activo, true))
      .orderBy(productos.nombre),
  ]);

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-xs font-semibold">Economía de OVNIS</p>
            <h1 className="font-display mt-1 text-xl font-semibold text-white">
              Configuración de OVNIS
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/configuracion/ovnis/premios"
              className="text-sm text-zinc-400 hover:text-[#8cff59]"
            >
              Premios canjeables →
            </Link>
            <Link
              href="/configuracion/ovnis/ruleta"
              className="text-sm text-zinc-400 hover:text-[#8cff59]"
            >
              Premios de ruleta →
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        {/* Servicios */}
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">Servicios</p>
          <h2 className="font-display mt-2 text-lg font-semibold text-white">
            OVNIS por servicio
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Cuántos OVNIS gana el cliente al completar cada servicio.
          </p>
          <div className="mt-4 divide-y divide-zinc-800">
            {listaServicios.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-4 py-3">
                <span className="text-sm font-medium text-white">{s.nombre}</span>
                <OvnisValueEditor
                  entityId={s.id}
                  entityType="servicio"
                  currentValue={s.ovnisValue}
                />
              </div>
            ))}
            {listaServicios.length === 0 && (
              <p className="py-4 text-sm text-zinc-500">No hay servicios activos.</p>
            )}
          </div>
        </section>

        {/* Productos */}
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">Productos</p>
          <h2 className="font-display mt-2 text-lg font-semibold text-white">
            OVNIS por producto
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Cuántos OVNIS gana el cliente al comprar cada producto.
          </p>
          <div className="mt-4 divide-y divide-zinc-800">
            {listaProductos.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{p.nombre}</span>
                  {p.esConsumicion && (
                    <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-2 py-0.5 text-[10px] font-semibold text-[#8cff59]">
                      consumición
                    </span>
                  )}
                </div>
                <OvnisValueEditor
                  entityId={p.id}
                  entityType="producto"
                  currentValue={p.ovnisValue}
                />
              </div>
            ))}
            {listaProductos.length === 0 && (
              <p className="py-4 text-sm text-zinc-500">No hay productos activos.</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
