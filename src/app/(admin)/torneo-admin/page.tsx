import { redirect } from "next/navigation";
import { requireAdminSession } from "@/lib/admin-action";
import { esTorneoDePrueba, getTorneoVigente, listarEquipos, listarJugadores, listarPartidos } from "@/lib/torneo-data";
import { nombresPublicos } from "@/lib/torneo";
import { progresoReveal } from "@/lib/torneo-juego";
import Panel, { PanelSinTorneo, type JugadorPanel, type PanelDatos } from "./_Panel";
import type { PartidoVista } from "./_Partidos";

export const dynamic = "force-dynamic";

const TZ = "America/Argentina/Buenos_Aires";

function formatARS(value: string | number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/** "YYYY-MM-DDTHH:mm" en hora de Buenos Aires, para el input datetime-local. */
function fechaParaInput(fecha: Date | null): string {
  if (!fecha) return "";
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const pick = (type: string) => partes.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

/** "sáb 10 oct · 20:00" en hora de Buenos Aires. */
function fechaParaLeer(fecha: Date | null): string | null {
  if (!fecha) return null;
  const dia = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" })
    .format(fecha)
    .replace(/\./g, "")
    .replace(",", "");
  const hora = new Intl.DateTimeFormat("es-AR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    fecha,
  );
  return `${dia} · ${hora}`;
}

export default async function TorneoAdminPage() {
  if (!(await requireAdminSession())) redirect("/hoy");

  const torneo = await getTorneoVigente();
  if (!torneo) return <PanelSinTorneo />;

  const [jugadores, equipos, partidos] = await Promise.all([
    listarJugadores(torneo.id),
    listarEquipos(torneo.id),
    listarPartidos(torneo.id),
  ]);

  const nombreEquipoPorId = new Map(equipos.map((e) => [e.id, e.nombre] as const));
  // El alias es como lo conoce todo el mundo en el local; el nombre completo va debajo, más chico.
  const alias = nombresPublicos(jugadores);
  const jugadoresPanel: JugadorPanel[] = jugadores.map((j, i) => ({
    id: j.id,
    alias: alias[i],
    nombre: j.nombre,
    email: j.email,
    whatsapp: j.whatsapp,
    estadoPago: j.estadoPago,
    ordenPago: j.ordenPago,
    posicionSorteo: j.posicionSorteo,
    equipoNombre: j.equipoId ? (nombreEquipoPorId.get(j.equipoId) ?? null) : null,
  }));
  const partidosVista: PartidoVista[] = partidos.map((p) => ({
    id: p.id,
    ronda: p.ronda,
    posicion: p.posicion,
    jugadorAId: p.jugadorAId,
    jugadorBId: p.jugadorBId,
    ganadorId: p.ganadorId,
    marcadorA: p.marcadorA,
    marcadorB: p.marcadorB,
    esBye: p.esBye,
    estado: p.estado,
  }));

  const datos: PanelDatos = {
    torneo: {
      nombre: torneo.nombre,
      estado: torneo.estado,
      cupo: torneo.cupo,
      cuota: formatARS(torneo.cuotaArs),
      fechaTexto: fechaParaLeer(torneo.fecha),
      fechaLocal: fechaParaInput(torneo.fecha),
      premiosTexto: torneo.premiosTexto ?? "",
      esPrueba: esTorneoDePrueba(torneo.nombre),
    },
    // Dos fases: un paso por jugador (ruleta de equipos) y uno por cruce. Los sorteos de antes, solo cruces.
    reveal: (() => {
      const r = progresoReveal(torneo, partidos);
      return { paso: r.paso, total: r.total, pasosEquipos: r.jugadores };
    })(),
    jugadores: jugadoresPanel,
    equipos: equipos.map((e) => e.nombre),
    partidos: partidosVista,
  };

  return <Panel datos={datos} />;
}
