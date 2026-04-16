import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  atencionesProductos,
  barberos,
  clients,
  mediosPago,
  productos,
  servicios,
  serviciosAdicionales,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AtencionForm from "@/components/caja/AtencionForm";
import { getCajaActorContext } from "@/lib/caja-access";
import { formatARS } from "@/lib/format";
import { editarAtencion } from "../../actions";

function formatFechaEditable(fecha: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(`${fecha}T12:00:00-03:00`));
}

function formatHoraEditable(hora: string | null | undefined): string {
  if (!hora) return "Sin hora";
  return hora.slice(0, 5);
}

function buildClientLabel(
  client: {
    name: string;
    phoneRaw: string | null;
  } | null
): string {
  if (!client) return "Caja comun";
  return client.phoneRaw ? `${client.name} - ${client.phoneRaw}` : client.name;
}

export default async function EditarAtencionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fechaHoy = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const [atencion] = await db
    .select()
    .from(atenciones)
    .where(eq(atenciones.id, id))
    .limit(1);

  if (!atencion) notFound();
  if (atencion.anulado) redirect("/caja");

  const fechaAtencionLabel = formatFechaEditable(atencion.fecha);

  if (atencion.fecha !== fechaHoy) {
    return (
      <main className="app-shell min-h-screen px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center">
          <div className="panel-card w-full rounded-[32px] p-6 sm:p-8">
            <p className="eyebrow text-xs font-semibold">Edicion bloqueada</p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-white">
              Solo se pueden editar atenciones de hoy.
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Esta atencion corresponde al {fechaAtencionLabel}. Para mantener caja,
              stock y comisiones consistentes, la edicion queda limitada al movimiento
              del dia actual.
            </p>
            <Link
              href="/caja"
              className="ghost-button mt-6 inline-flex min-h-[48px] items-center justify-center rounded-[22px] px-5 text-sm font-semibold"
            >
              Volver a caja
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const actor = await getCajaActorContext();
  const isAdmin = actor?.isAdmin ?? false;

  const [
    barberosActivos,
    serviciosActivos,
    adicionalesAll,
    mediosPagoActivos,
    productosActivos,
    adicionalesDeAtencion,
    productosDeAtencion,
    atencionClient,
  ] = await Promise.all([
    db.select().from(barberos).where(eq(barberos.activo, true)),
    db.select().from(servicios).where(eq(servicios.activo, true)),
    db.select().from(serviciosAdicionales),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
    db.select().from(productos).where(eq(productos.activo, true)),
    db
      .select()
      .from(atencionesAdicionales)
      .where(eq(atencionesAdicionales.atencionId, id)),
    db
      .select()
      .from(atencionesProductos)
      .where(eq(atencionesProductos.atencionId, id)),
    atencion.clientId
      ? db
          .select({
            id: clients.id,
            name: clients.name,
            phoneRaw: clients.phoneRaw,
            esMarciano: clients.esMarciano,
          })
          .from(clients)
          .where(eq(clients.id, atencion.clientId))
          .limit(1)
      : Promise.resolve([]),
  ]);

  const preselectedBarberoId = actor?.barberoId;

  if (!isAdmin && !preselectedBarberoId) {
    return (
      <main className="app-shell min-h-screen px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl items-center">
          <div className="panel-card w-full rounded-[32px] p-6 sm:p-8">
            <p className="eyebrow text-xs font-semibold">Acceso requerido</p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-white">
              Tu usuario no tiene un barbero activo vinculado.
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-300">
              Vincula el usuario desde configuracion para poder editar atenciones sin
              perder trazabilidad.
            </p>
            <Link
              href="/caja"
              className="ghost-button mt-6 inline-flex min-h-[48px] items-center justify-center rounded-[22px] px-5 text-sm font-semibold"
            >
              Volver a caja
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin && atencion.barberoId !== preselectedBarberoId) {
    redirect("/caja");
  }

  const barberoActual = barberosActivos.find((item) => item.id === atencion.barberoId) ?? null;
  const servicioActual = serviciosActivos.find((item) => item.id === atencion.servicioId) ?? null;
  const medioPagoActual = mediosPagoActivos.find((item) => item.id === atencion.medioPagoId) ?? null;
  const clientActual = atencionClient[0]
    ? {
        id: atencionClient[0].id,
        name: atencionClient[0].name,
        phoneRaw: atencionClient[0].phoneRaw,
        esMarciano: atencionClient[0].esMarciano,
      }
    : null;

  const servicioMontoActual = Number(atencion.precioCobrado ?? 0);
  const productosMontoActual = productosDeAtencion.reduce(
    (sum, item) => sum + Number(item.precioUnitario ?? 0) * Number(item.cantidad ?? 0),
    0
  );
  const totalActual = servicioMontoActual + productosMontoActual;
  const cantidadProductosActual = productosDeAtencion.reduce(
    (sum, item) => sum + Number(item.cantidad ?? 0),
    0
  );

  const editarConId = editarAtencion.bind(null, id);

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center gap-3">
          <Link href="/caja" className="text-sm text-zinc-400 transition-colors hover:text-[#8cff59]">
            Volver a caja
          </Link>
        </div>

        <section className="mb-6 overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.22),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.16),_transparent_30%)] p-6 sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-xs font-semibold">Caja / edicion de atencion</p>
                <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Editar atencion
                </h1>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  Estas ajustando un movimiento ya registrado. Cambiar servicio, cliente,
                  productos o medio de pago recalcula stock y comisiones; las notas solo
                  suman contexto operativo.
                </p>

                <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-zinc-300">
                    Movimiento #{id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-zinc-300">
                    {fechaAtencionLabel}
                  </span>
                  <span className="rounded-full border border-zinc-700 bg-zinc-950/70 px-3 py-1 text-zinc-300">
                    {formatHoraEditable(atencion.hora)}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[380px]">
                <div className="rounded-[24px] border border-zinc-700 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Servicio actual
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatARS(servicioMontoActual)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {servicioActual?.nombre ?? "Sin servicio"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-zinc-700 bg-white/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    Productos actuales
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {formatARS(productosMontoActual)}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {cantidadProductosActual} item{cantidadProductosActual === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/12 p-4 text-emerald-50 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100/80">
                    Total del movimiento
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-white">{formatARS(totalActual)}</p>
                  <p className="mt-1 text-sm text-emerald-100/80">
                    Servicio, productos y comisiones se rearmaron para este guardado.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-zinc-700 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Barbero
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {barberoActual?.nombre ?? "Sin barbero"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {barberoActual?.porcentajeComision
                    ? `${barberoActual.porcentajeComision}% de comision`
                    : "Comision segun el perfil"}
                </p>
              </div>

              <div className="rounded-[22px] border border-zinc-700 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Cliente
                </p>
                <p className="mt-2 text-sm font-semibold text-white">{buildClientLabel(clientActual)}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {clientActual?.esMarciano ? "Marciano activo" : "Caja comun"}
                </p>
              </div>

              <div className="rounded-[22px] border border-zinc-700 bg-black/20 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                  Medio de pago
                </p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {medioPagoActual?.nombre ?? "Sin medio"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {medioPagoActual?.comisionPorcentaje
                    ? `${medioPagoActual.comisionPorcentaje}% sobre el servicio`
                    : "Sin comision extra"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="panel-card rounded-[30px] p-4 sm:p-5">
          <AtencionForm
            action={editarConId}
            barberosList={barberosActivos.map((b) => ({
              id: b.id,
              nombre: b.nombre,
              porcentajeComision: b.porcentajeComision,
            }))}
            serviciosList={serviciosActivos.map((s) => ({
              id: s.id,
              nombre: s.nombre,
              precioBase: s.precioBase,
            }))}
            adicionalesList={adicionalesAll.map((a) => ({
              id: a.id,
              servicioId: a.servicioId,
              nombre: a.nombre,
              precioExtra: a.precioExtra,
            }))}
            mediosPagoList={mediosPagoActivos.map((m) => ({
              id: m.id,
              nombre: m.nombre,
              comisionPorcentaje: m.comisionPorcentaje,
            }))}
            productosList={productosActivos.map((producto) => ({
              id: producto.id,
              nombre: producto.nombre,
              precioVenta: producto.precioVenta,
              stockActual: producto.stockActual,
              esConsumicion: producto.esConsumicion,
            }))}
            preselectedBarberoId={preselectedBarberoId}
            isAdmin={isAdmin}
            initialData={{
              barberoId: atencion.barberoId ?? undefined,
              client: clientActual,
              servicioId: atencion.servicioId ?? undefined,
              adicionalesIds: adicionalesDeAtencion.map((a) => a.adicionalId ?? "").filter(Boolean),
              precioCobrado: atencion.precioCobrado ?? undefined,
              medioPagoId: atencion.medioPagoId ?? undefined,
              notas: atencion.notas,
              productos: productosDeAtencion.map((producto) => ({
                productoId: producto.productoId ?? "",
                cantidad: producto.cantidad ?? 0,
                precioUnitario: producto.precioUnitario,
                esMarcianoIncluido: producto.esMarcianoIncluido ?? false,
              })),
            }}
            editContext={{
              movementCode: id.slice(0, 8).toUpperCase(),
              dateLabel: fechaAtencionLabel,
              timeLabel: formatHoraEditable(atencion.hora),
              barberoLabel: barberoActual?.nombre ?? "Sin barbero",
              clientLabel: buildClientLabel(clientActual),
              servicioLabel: servicioActual?.nombre ?? "Sin servicio",
              medioPagoLabel: medioPagoActual?.nombre ?? "Sin medio",
              serviceAmount: formatARS(servicioMontoActual),
              productsAmount: formatARS(productosMontoActual),
              totalAmount: formatARS(totalActual),
            }}
            submitLabel="Guardar cambios"
            cancelLabel="Descartar cambios"
            cancelHref="/caja"
          />
        </div>
      </div>
    </main>
  );
}
