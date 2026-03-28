import { db } from "@/db";
import { atenciones, barberos, servicios, mediosPago, cierresCaja } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import Link from "next/link";
import AnularButton from "@/components/caja/AnularButton";
import { anularAtencion } from "./actions";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function getFechaHoy(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatFechaLarga(fechaISO: string): string {
  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatHora(hora: string | null): string {
  if (!hora) return "—";
  // hora viene como "HH:MM:SS+tz" o "HH:MM:SS"
  return hora.slice(0, 5);
}

export default async function CajaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const userId = session?.user?.id;

  const fechaHoy = getFechaHoy();

  // Verificar cierre del día
  const [cierreHoy] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  // Obtener barbero vinculado al usuario logueado (si no es admin)
  const [barberoDelUsuario] = isAdmin
    ? [null]
    : await db
        .select()
        .from(barberos)
        .where(eq(barberos.userId, userId!))
        .limit(1);

  // Atenciones del día
  const atencionesDelDia = isAdmin
    ? await db
        .select()
        .from(atenciones)
        .where(eq(atenciones.fecha, fechaHoy))
    : await db
        .select()
        .from(atenciones)
        .where(
          and(
            eq(atenciones.fecha, fechaHoy),
            eq(atenciones.barberoId, barberoDelUsuario?.id ?? "")
          )
        );

  // Datos relacionados
  const barberosMap = new Map(
    (await db.select().from(barberos)).map((b) => [b.id, b])
  );
  const serviciosMap = new Map(
    (await db.select().from(servicios)).map((s) => [s.id, s])
  );
  const mediosPagoMap = new Map(
    (await db.select().from(mediosPago)).map((m) => [m.id, m])
  );

  // Totales del día (solo atenciones activas)
  const atencionesActivas = atencionesDelDia.filter((a) => !a.anulado);
  const totalBruto = atencionesActivas.reduce(
    (sum, a) => sum + Number(a.precioCobrado ?? 0),
    0
  );
  const totalComisionesMp = atencionesActivas.reduce(
    (sum, a) => sum + Number(a.comisionMedioPagoMonto ?? 0),
    0
  );
  const totalNeto = atencionesActivas.reduce(
    (sum, a) => sum + Number(a.montoNeto ?? 0),
    0
  );
  const totalAtenciones = atencionesActivas.length;

  // Desglose por barbero (solo admin)
  const desglosePorBarbero = isAdmin
    ? Array.from(
        atencionesActivas.reduce(
          (map, a) => {
            if (!a.barberoId) return map;
            const prev = map.get(a.barberoId) ?? { cortes: 0, bruto: 0 };
            map.set(a.barberoId, {
              cortes: prev.cortes + 1,
              bruto: prev.bruto + Number(a.precioCobrado ?? 0),
            });
            return map;
          },
          new Map<string, { cortes: number; bruto: number }>()
        )
      )
    : [];

  // Ordenar atenciones: más recientes primero
  const atencionesOrdenadas = [...atencionesDelDia].sort((a, b) => {
    if (!a.creadoEn || !b.creadoEn) return 0;
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
  });

  // Datos del mes — solo para barberos (no admin)
  const hoyStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const [anio, mes] = hoyStr.split("-");
  const inicioDeMes = `${anio}-${mes}-01`;
  const finDeMes = hoyStr;

  let cortesDelMes = 0;
  let brutoDelMes = 0;
  let comisionDelMes = 0;
  let alquilerMensual = 0;
  let netoProyectado = 0;

  if (!isAdmin && barberoDelUsuario) {
    const atencionesDelMes = await db
      .select()
      .from(atenciones)
      .where(
        and(
          eq(atenciones.barberoId, barberoDelUsuario.id),
          eq(atenciones.anulado, false),
          gte(atenciones.fecha, inicioDeMes),
          lte(atenciones.fecha, finDeMes)
        )
      );

    cortesDelMes = atencionesDelMes.length;
    brutoDelMes = atencionesDelMes.reduce(
      (s, a) => s + Number(a.precioCobrado ?? 0),
      0
    );
    comisionDelMes = atencionesDelMes.reduce(
      (s, a) => s + Number(a.comisionBarberoMonto ?? 0),
      0
    );
    alquilerMensual =
      barberoDelUsuario.tipoModelo === "hibrido"
        ? Number(barberoDelUsuario.alquilerBancoMensual ?? 0)
        : 0;
    netoProyectado = comisionDelMes - alquilerMensual;
  }

  return (
    <main className="min-h-screen p-4 max-w-2xl mx-auto pb-16">
      {/* Banner cierre */}
      {cierreHoy ? (
        <div className="bg-gray-900 text-white rounded-xl p-4 mb-4 flex items-center justify-between">
          <span className="text-sm font-medium">✓ Caja cerrada</span>
          <Link href={`/caja/cierre/${fechaHoy}`} className="text-sm text-gray-300 hover:text-white underline">
            Ver resumen →
          </Link>
        </div>
      ) : isAdmin ? (
        <Link
          href="/caja/cierre"
          className="block bg-white border border-gray-200 rounded-xl p-4 mb-4 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-center"
        >
          Cerrar caja del día →
        </Link>
      ) : null}

      {/* Encabezado */}
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 capitalize">
          {formatFechaLarga(fechaHoy)}
        </h1>
      </div>

      {/* Resumen del día */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Resumen del día
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-gray-500">Atenciones</p>
            <p className="text-xl font-bold text-gray-900">{totalAtenciones}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Bruto</p>
            <p className="text-xl font-bold text-gray-900">
              {formatARS(totalBruto)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Neto</p>
            <p className="text-lg font-semibold text-gray-700">
              {formatARS(totalNeto)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Comis. cobradas</p>
            <p className="text-lg font-semibold text-gray-700">
              {formatARS(totalComisionesMp)}
            </p>
          </div>
        </div>

        {/* Desglose por barbero (solo admin) */}
        {isAdmin && desglosePorBarbero.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Por barbero
            </p>
            <div className="flex flex-col gap-1">
              {desglosePorBarbero.map(([barberoId, datos]) => {
                const barbero = barberosMap.get(barberoId);
                return (
                  <div
                    key={barberoId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-gray-700">
                      {barbero?.nombre ?? "—"}
                    </span>
                    <span className="text-gray-500">
                      {datos.cortes} corte{datos.cortes !== 1 ? "s" : ""}{" "}
                      →{" "}
                      <span className="font-medium text-gray-900">
                        {formatARS(datos.bruto)}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Botón nueva atención — oculto si la caja ya está cerrada */}
      {!cierreHoy && (
        <Link
          href="/caja/nueva"
          className="flex items-center justify-center w-full min-h-[52px] bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors mb-5"
        >
          + Nueva atención
        </Link>
      )}

      {/* Lista de atenciones */}
      <div>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Atenciones de hoy
        </h2>

        {atencionesOrdenadas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
            No hay atenciones registradas hoy.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {atencionesOrdenadas.map((atencion) => {
              const barbero = barberosMap.get(atencion.barberoId ?? "");
              const servicio = serviciosMap.get(atencion.servicioId ?? "");
              const mp = mediosPagoMap.get(atencion.medioPagoId ?? "");

              return (
                <div
                  key={atencion.id}
                  className={`bg-white rounded-xl border border-gray-200 p-4 ${
                    atencion.anulado ? "opacity-50" : ""
                  }`}
                >
                  {/* Encabezado de la card */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-gray-900">
                      <span className="text-gray-400">
                        {formatHora(atencion.hora)}
                      </span>
                      <span className="text-gray-300">—</span>
                      <span>{barbero?.nombre ?? "—"}</span>
                      <span className="text-gray-300">—</span>
                      <span>{servicio?.nombre ?? "—"}</span>
                    </div>
                    {atencion.anulado && (
                      <span className="shrink-0 bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Anulada
                      </span>
                    )}
                  </div>

                  {/* Precios */}
                  <div className="text-sm text-gray-500 mb-1">
                    {formatARS(atencion.precioCobrado)}
                    {mp && (
                      <>
                        {" · "}
                        {mp.nombre ?? "—"}
                        {Number(mp.comisionPorcentaje ?? 0) > 0
                          ? ` (${mp.comisionPorcentaje}%)`
                          : ""}
                      </>
                    )}
                    {" · Neto: "}
                    <span className="font-medium text-gray-700">
                      {formatARS(atencion.montoNeto)}
                    </span>
                  </div>

                  {/* Motivo anulación */}
                  {atencion.anulado && atencion.motivoAnulacion && (
                    <p className="text-xs text-gray-400 mb-2">
                      Motivo: {atencion.motivoAnulacion}
                    </p>
                  )}

                  {/* Notas */}
                  {atencion.notas && !atencion.anulado && (
                    <p className="text-xs text-gray-400 mb-2">
                      {atencion.notas}
                    </p>
                  )}

                  {/* Acciones */}
                  {!atencion.anulado && (
                    <div className="flex gap-2 mt-2">
                      <Link
                        href={`/caja/${atencion.id}/editar`}
                        className="min-h-[44px] px-4 flex items-center justify-center bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                      >
                        Editar
                      </Link>
                      {isAdmin && (
                        <AnularButton
                          atencionId={atencion.id}
                          anularAction={anularAtencion}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sección Mi Mes — solo para barbero */}
      {!isAdmin && barberoDelUsuario && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Mi mes —{" "}
            {new Date(inicioDeMes + "T12:00:00").toLocaleDateString("es-AR", {
              month: "long",
              year: "numeric",
              timeZone: "America/Argentina/Buenos_Aires",
            })}
          </h3>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cortes este mes</span>
              <span className="font-medium text-gray-900">{cortesDelMes}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bruto acumulado</span>
              <span className="font-medium text-gray-900">
                {formatARS(brutoDelMes)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Mi comisión ({barberoDelUsuario.porcentajeComision ?? 0}%)
              </span>
              <span className="font-medium text-gray-900">
                {formatARS(comisionDelMes)}
              </span>
            </div>
            {alquilerMensual > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Alquiler banco (mes)</span>
                <span className="text-red-600">
                  −{formatARS(alquilerMensual)}
                </span>
              </div>
            )}
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
              <span className="text-gray-700 font-medium">
                Mi neto proyectado
              </span>
              <span className="font-bold text-gray-900">
                {formatARS(Math.max(0, netoProyectado))}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
