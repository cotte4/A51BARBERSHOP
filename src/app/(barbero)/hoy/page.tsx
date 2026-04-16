import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  clients,
  mediosPago,
  servicios,
  stockMovimientos,
  turnos as turnosTable,
} from "@/db/schema";
import { registrarAtencionExpressAction } from "@/app/(barbero)/caja/actions";
import {
  confirmarTurnoAction,
  rechazarTurnoAction,
} from "@/app/(admin)/turnos/actions";
import { getTurnosActorContext } from "@/lib/turnos-access";
import { getTurnosVisibleList } from "@/lib/turnos";
import HoyDashboard from "./_HoyDashboard";

function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function getHoraActualArgentina(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function formatFechaHoyLabel(fechaHoy: string): string {
  const [year, month, day] = fechaHoy.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function HoyPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return null;
  }

  const fechaHoy = getFechaHoyArgentina();
  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);

  const [
    barberoActual,
    atencionesHoyRows,
    ventasHoyRows,
    mediosPagoList,
    serviciosList,
    turnosHoy,
    marcianosTurnosHoy,
  ] = await Promise.all([
    actor.barberoId
      ? db
          .select()
          .from(barberos)
          .where(eq(barberos.id, actor.barberoId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select({
        id: atenciones.id,
        precioCobrado: atenciones.precioCobrado,
        anulado: atenciones.anulado,
      })
      .from(atenciones)
      .where(
        and(
          eq(atenciones.fecha, fechaHoy),
          actor.barberoId ? eq(atenciones.barberoId, actor.barberoId) : undefined
        )
      )
      .orderBy(desc(atenciones.creadoEn)),
    db
      .select({
        cantidad: stockMovimientos.cantidad,
        precioUnitario: stockMovimientos.precioUnitario,
      })
      .from(stockMovimientos)
      .where(
        and(
          eq(stockMovimientos.tipo, "venta"),
          gte(stockMovimientos.fecha, inicioDia),
          lte(stockMovimientos.fecha, finDia)
        )
      ),
    db.select().from(mediosPago),
    db.select().from(servicios),
    getTurnosVisibleList(fechaHoy, undefined, actor.barberoId ?? undefined),
    db
      .select({
        turnoId: turnosTable.id,
        horaInicio: turnosTable.horaInicio,
        clienteNombre: turnosTable.clienteNombre,
      })
      .from(turnosTable)
      .leftJoin(clients, eq(clients.id, turnosTable.clientId))
      .where(
        and(
          eq(turnosTable.fecha, fechaHoy),
          eq(turnosTable.esMarcianoSnapshot, true),
          inArray(turnosTable.estado, ["pendiente", "confirmado"])
        )
      )
      .orderBy(turnosTable.horaInicio),
  ]);

  const serviciosActivos = serviciosList.filter((s) => s.activo);
  const mediosPagoActivos = mediosPagoList.filter((m) => m.activo);

  const activeAtenciones = atencionesHoyRows.filter((r) => !r.anulado);
  const atencionesCount = activeAtenciones.length;
  const ingresosServicios = activeAtenciones.reduce(
    (sum, r) => sum + Number(r.precioCobrado ?? 0),
    0
  );
  const ingresosProductos = ventasHoyRows.reduce(
    (sum, r) => sum + Math.abs(Number(r.cantidad ?? 0)) * Number(r.precioUnitario ?? 0),
    0
  );
  const totalCobrado = ingresosServicios + ingresosProductos;

  const horaActual = getHoraActualArgentina();
  const turnosOperativos = turnosHoy.filter(
    (t) => t.estado === "pendiente" || t.estado === "confirmado"
  );
  const turnosPendientes = turnosHoy.filter((t) => t.estado === "pendiente");
  const proximoTurno =
    turnosOperativos.find((t) => t.horaInicio >= horaActual) ?? turnosOperativos[0] ?? null;

  const turnosPendientesConAcciones = turnosPendientes.map((turno) => ({
    turno,
    confirmarAction: confirmarTurnoAction.bind(null, turno.id),
    rechazarAction: rechazarTurnoAction.bind(null, turno.id),
  }));

  const fechaLabel = formatFechaHoyLabel(fechaHoy);

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-6">
      <HoyDashboard
        barberoNombre={barberoActual?.nombre ?? "A51"}
        fechaLabel={fechaLabel}
        totalCobrado={totalCobrado}
        atencionesCount={atencionesCount}
        turnosOperativos={turnosOperativos}
        turnosPendientesConAcciones={turnosPendientesConAcciones}
        proximoTurno={proximoTurno}
        servicios={serviciosActivos.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          precioBase: s.precioBase,
        }))}
        mediosPago={mediosPagoActivos.map((m) => ({
          id: m.id,
          nombre: m.nombre,
          comisionPorcentaje: m.comisionPorcentaje,
        }))}
        registrarAction={registrarAtencionExpressAction}
        marcianosTurnos={marcianosTurnosHoy.map((m) => ({
          turnoId: m.turnoId,
          horaInicio: m.horaInicio,
          clienteNombre: m.clienteNombre,
        }))}
      />
    </div>
  );
}
