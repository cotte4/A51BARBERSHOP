// Partido por el tercer puesto: lo juegan los que pierden las semis. Puro: sin DB.
import { describe, expect, it } from "vitest";
import {
  avanzarGanador,
  caminoDe,
  calcularPodio,
  esFinal,
  esTercerPuesto,
  POSICION_TERCER_PUESTO,
  sortearTorneo,
  torneoTerminado,
  type PartidoCuadro,
} from "@/lib/torneo";

const ids = (prefijo: string, n: number) => Array.from({ length: n }, (_, i) => `${prefijo}${i + 1}`);

/** Juega toda una ronda (sin el tercer puesto): gana siempre el jugador A, 2 a 1. */
function jugarRonda(cuadro: PartidoCuadro[], ronda: number): PartidoCuadro[] {
  let c = cuadro;
  for (const p of c.filter((x) => x.ronda === ronda && !x.esBye && !esTercerPuesto(x, c))) {
    const actual = c.find((x) => x.ronda === p.ronda && x.posicion === p.posicion)!;
    if (actual.ganadorId || !actual.jugadorAId || !actual.jugadorBId) continue;
    c = avanzarGanador(c, actual.ronda, actual.posicion, actual.jugadorAId, { a: 2, b: 1 });
  }
  return c;
}

describe("tercer puesto", () => {
  it("con 16 jugadores el cuadro trae el partido por el tercer puesto en la ronda de la final", () => {
    const r = sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 16), semilla: "x" });
    const tercero = r.partidos.filter((p) => p.ronda === 4 && p.posicion === POSICION_TERCER_PUESTO);
    expect(tercero).toHaveLength(1);
    expect(esTercerPuesto(tercero[0], r.partidos)).toBe(true);
    expect(r.partidos.filter((p) => esFinal(p, r.partidos))).toHaveLength(1);
  });

  it("con 3 jugadores (una semi es pase directo) no hay tercer puesto", () => {
    const r = sortearTorneo({ jugadorIds: ids("j", 3), equipoIds: ids("e", 3), semilla: "x" });
    expect(r.partidos.some((p) => p.ronda === r.rondas && p.posicion === POSICION_TERCER_PUESTO)).toBe(false);
  });

  it("con 2 jugadores no hay semis ni tercer puesto", () => {
    const r = sortearTorneo({ jugadorIds: ids("j", 2), equipoIds: ids("e", 2), semilla: "x" });
    expect(r.partidos).toHaveLength(1);
  });

  it("los que pierden las semis van al tercer puesto; el torneo termina con la final y el tercer puesto", () => {
    let c = sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 16), semilla: "y" }).partidos;
    c = jugarRonda(c, 1);
    c = jugarRonda(c, 2);
    const semis = c.filter((p) => p.ronda === 3);
    c = jugarRonda(c, 3);
    const perdedores = semis.map((s) => s.jugadorBId);
    const tercero = c.find((p) => esTercerPuesto(p, c))!;
    expect([tercero.jugadorAId, tercero.jugadorBId]).toEqual(perdedores);
    expect(tercero.estado).toBe("listo");

    // Antes de la final se juega el tercer puesto: todavía no terminó.
    c = avanzarGanador(c, 4, POSICION_TERCER_PUESTO, tercero.jugadorBId!, { a: 0, b: 3 });
    expect(torneoTerminado(c)).toBe(false);
    const final = c.find((p) => esFinal(p, c))!;
    c = avanzarGanador(c, 4, 1, final.jugadorAId!, { a: 1, b: 1 });
    expect(torneoTerminado(c)).toBe(true);

    const podio = calcularPodio(c);
    expect(podio.campeonId).toBe(final.jugadorAId);
    expect(podio.subcampeonId).toBe(final.jugadorBId);
    expect(podio.tercerJugado).toBe(true);
    expect(podio.tercerosIds).toEqual([tercero.jugadorBId, tercero.jugadorAId]);
  });

  it("la final jugada sin el tercer puesto todavía no termina el torneo", () => {
    let c = sortearTorneo({ jugadorIds: ids("j", 8), equipoIds: ids("e", 8), semilla: "z" }).partidos;
    c = jugarRonda(c, 1);
    c = jugarRonda(c, 2);
    const final = c.find((p) => esFinal(p, c))!;
    c = avanzarGanador(c, 3, 1, final.jugadorAId!, { a: 2, b: 0 });
    expect(torneoTerminado(c)).toBe(false);
    expect(calcularPodio(c).campeonId).toBe(final.jugadorAId);
  });

  it("una semi no se corrige si el tercer puesto ya se jugó", () => {
    let c = sortearTorneo({ jugadorIds: ids("j", 4), equipoIds: ids("e", 4), semilla: "w" }).partidos;
    c = jugarRonda(c, 1);
    const tercero = c.find((p) => esTercerPuesto(p, c))!;
    c = avanzarGanador(c, 2, POSICION_TERCER_PUESTO, tercero.jugadorAId!, { a: 1, b: 0 });
    const semi = c.find((p) => p.ronda === 1 && p.posicion === 1)!;
    expect(() => avanzarGanador(c, 1, 1, semi.jugadorBId!, { a: 0, b: 1 })).toThrow(/tercer puesto/);
  });

  it("corregir una semi (antes del tercer puesto) cambia también quién juega por el tercero", () => {
    let c = sortearTorneo({ jugadorIds: ids("j", 4), equipoIds: ids("e", 4), semilla: "v" }).partidos;
    c = jugarRonda(c, 1);
    const semi = c.find((p) => p.ronda === 1 && p.posicion === 1)!;
    c = avanzarGanador(c, 1, 1, semi.jugadorBId!, { a: 0, b: 2 });
    const tercero = c.find((p) => esTercerPuesto(p, c))!;
    expect(tercero.jugadorAId).toBe(semi.jugadorAId);
    expect(c.find((p) => esFinal(p, c))!.jugadorAId).toBe(semi.jugadorBId);
  });

  it("un torneo de antes (sin tercer puesto) sigue terminando con la final", () => {
    let c = sortearTorneo({ jugadorIds: ids("j", 4), equipoIds: ids("e", 4), semilla: "u" }).partidos;
    c = c.filter((p) => !(p.ronda === 2 && p.posicion === POSICION_TERCER_PUESTO));
    c = jugarRonda(c, 1);
    const final = c.find((p) => p.ronda === 2)!;
    c = avanzarGanador(c, 2, 1, final.jugadorAId!, { a: 3, b: 1 });
    expect(torneoTerminado(c)).toBe(true);
    expect(calcularPodio(c).tercerosIds).toHaveLength(2);
    expect(calcularPodio(c).tercerJugado).toBe(false);
  });

  it("el camino del campeón: un rival por ronda, en orden, con los goles desde su lado", () => {
    let c = sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 16), semilla: "camino" }).partidos;
    c = jugarRonda(c, 1);
    c = jugarRonda(c, 2);
    c = jugarRonda(c, 3);
    const tercero = c.find((p) => esTercerPuesto(p, c))!;
    c = avanzarGanador(c, 4, POSICION_TERCER_PUESTO, tercero.jugadorAId!, { a: 1, b: 0 });
    const final = c.find((p) => esFinal(p, c))!;
    // La final la gana B por penales: el camino tiene que leer los goles desde su lado.
    c = avanzarGanador(c, 4, 1, final.jugadorBId!, { a: 2, b: 2 });
    const camino = caminoDe(c, final.jugadorBId!);
    expect(camino.map((p) => p.ronda)).toEqual([1, 2, 3, 4]);
    expect(camino[3]).toEqual({ ronda: 4, rivalId: final.jugadorAId, golesPropios: 2, golesRival: 2, penales: true });
    expect(camino[0].golesPropios).toBe(2);
    expect(camino[0].golesRival).toBe(1);
  });
});
