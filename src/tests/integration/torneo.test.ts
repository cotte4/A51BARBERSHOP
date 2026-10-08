import { describe, expect, it } from "vitest";
import {
  errorAlias,
  fueAPenales,
  leerReveal,
  ordenRuleta,
  revealDesdePaso,
  SEMILLA_DOS_FASES,
  topeRevealGuardado,
  limpiarAlias,
  nombresCortosUnicos,
  nombresPublicos,
  avanzarGanador,
  calcularPodio,
  resumenCupo,
  siguienteOrdenPago,
  sortearTorneo,
  tamanoCuadro,
  torneoTerminado,
  type PartidoCuadro,
} from "@/lib/torneo";

const ids = (prefijo: string, n: number) => Array.from({ length: n }, (_, i) => `${prefijo}${i + 1}`);

function jugarTodo(partidos: PartidoCuadro[]): PartidoCuadro[] {
  // Siempre gana el jugador A: simula un torneo completo ronda por ronda.
  let cuadro = partidos;
  const rondas = Math.max(...cuadro.map((p) => p.ronda));
  for (let ronda = 1; ronda <= rondas; ronda++) {
    for (const p of cuadro.filter((x) => x.ronda === ronda)) {
      const actual = cuadro.find((x) => x.ronda === p.ronda && x.posicion === p.posicion)!;
      if (actual.esBye || actual.estado === "jugado") continue;
      cuadro = avanzarGanador(cuadro, actual.ronda, actual.posicion, actual.jugadorAId!);
    }
  }
  return cuadro;
}

describe("tamanoCuadro", () => {
  it("redondea a la potencia de 2 siguiente", () => {
    expect(tamanoCuadro(2)).toBe(2);
    expect(tamanoCuadro(3)).toBe(4);
    expect(tamanoCuadro(13)).toBe(16);
    expect(tamanoCuadro(16)).toBe(16);
    expect(tamanoCuadro(17)).toBe(32);
  });
});

describe("sortearTorneo", () => {
  const jugadores = ids("j", 16);
  const equipos = ids("e", 20);

  it("16 jugadores: 8 cruces en la ronda 1, 4 rondas, ningún bye", () => {
    const r = sortearTorneo({ jugadorIds: jugadores, equipoIds: equipos, semilla: "x" });
    expect(r.rondas).toBe(4);
    expect(r.partidos.filter((p) => p.ronda === 1)).toHaveLength(8);
    expect(r.partidos).toHaveLength(15);
    expect(r.partidos.some((p) => p.esBye)).toBe(false);
    expect(r.partidos.filter((p) => p.ronda === 1).every((p) => p.estado === "listo")).toBe(true);
  });

  it("cada jugador aparece una sola vez en la ronda 1", () => {
    const r = sortearTorneo({ jugadorIds: jugadores, equipoIds: equipos, semilla: "x" });
    const enRonda1 = r.partidos
      .filter((p) => p.ronda === 1)
      .flatMap((p) => [p.jugadorAId, p.jugadorBId]);
    expect(new Set(enRonda1).size).toBe(16);
    expect([...enRonda1].sort()).toEqual([...jugadores].sort());
  });

  it("los equipos nunca se repiten y salen del pool", () => {
    const r = sortearTorneo({ jugadorIds: jugadores, equipoIds: equipos, semilla: "otra" });
    const asignados = r.asignaciones.map((a) => a.equipoId);
    expect(new Set(asignados).size).toBe(16);
    expect(asignados.every((e) => equipos.includes(e))).toBe(true);
    expect(r.asignaciones.map((a) => a.posicionSorteo).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
  });

  it("misma semilla = mismo sorteo; otra semilla = otro sorteo", () => {
    const a = sortearTorneo({ jugadorIds: jugadores, equipoIds: equipos, semilla: "s1" });
    const b = sortearTorneo({ jugadorIds: jugadores, equipoIds: equipos, semilla: "s1" });
    const c = sortearTorneo({ jugadorIds: jugadores, equipoIds: equipos, semilla: "s2" });
    expect(b).toEqual(a);
    expect(c.asignaciones).not.toEqual(a.asignaciones);
  });

  it("13 jugadores: 3 byes en cruces distintos, ya avanzados a la ronda 2", () => {
    const r = sortearTorneo({ jugadorIds: ids("j", 13), equipoIds: equipos, semilla: "b" });
    const byes = r.partidos.filter((p) => p.ronda === 1 && p.esBye);
    expect(byes).toHaveLength(3);
    expect(new Set(byes.map((p) => p.posicion)).size).toBe(3);
    for (const bye of byes) {
      expect(bye.jugadorBId).toBeNull();
      expect(bye.ganadorId).toBe(bye.jugadorAId);
      expect(bye.estado).toBe("jugado");
      const siguiente = r.partidos.find(
        (p) => p.ronda === 2 && p.posicion === Math.ceil(bye.posicion / 2),
      )!;
      const lado = bye.posicion % 2 === 1 ? siguiente.jugadorAId : siguiente.jugadorBId;
      expect(lado).toBe(bye.ganadorId);
    }
  });

  it("2 jugadores: solo la final", () => {
    const r = sortearTorneo({ jugadorIds: ["a", "b"], equipoIds: ["e1", "e2"], semilla: "z" });
    expect(r.rondas).toBe(1);
    expect(r.partidos).toHaveLength(1);
    expect(r.partidos[0].estado).toBe("listo");
  });

  it("rechaza menos de 2 jugadores, faltante de equipos y repetidos", () => {
    expect(() => sortearTorneo({ jugadorIds: ["a"], equipoIds: ["e1"], semilla: "z" })).toThrow();
    expect(() =>
      sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 15), semilla: "z" }),
    ).toThrow(/equipos/);
    expect(() => sortearTorneo({ jugadorIds: ["a", "a"], equipoIds: ["e1", "e2"], semilla: "z" })).toThrow();
    expect(() => sortearTorneo({ jugadorIds: ["a", "b"], equipoIds: ["e1", "e1"], semilla: "z" })).toThrow();
  });
});

describe("avanzarGanador", () => {
  const base = sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 20), semilla: "x" }).partidos;

  it("no modifica el cuadro original y pasa al ganador a la ronda siguiente", () => {
    const p1 = base.find((p) => p.ronda === 1 && p.posicion === 1)!;
    const despues = avanzarGanador(base, 1, 1, p1.jugadorAId!, { a: 2, b: 2 });
    expect(base.find((p) => p.ronda === 1 && p.posicion === 1)!.ganadorId).toBeNull();
    const jugado = despues.find((p) => p.ronda === 1 && p.posicion === 1)!;
    expect(jugado.estado).toBe("jugado");
    expect(jugado.marcadorA).toBe(2);
    expect(despues.find((p) => p.ronda === 2 && p.posicion === 1)!.jugadorAId).toBe(p1.jugadorAId);
  });

  it("el partido siguiente queda 'listo' cuando están los dos", () => {
    let c = base;
    const a = c.find((p) => p.ronda === 1 && p.posicion === 1)!;
    const b = c.find((p) => p.ronda === 1 && p.posicion === 2)!;
    c = avanzarGanador(c, 1, 1, a.jugadorAId!);
    expect(c.find((p) => p.ronda === 2 && p.posicion === 1)!.estado).toBe("pendiente");
    c = avanzarGanador(c, 1, 2, b.jugadorBId!);
    const r2 = c.find((p) => p.ronda === 2 && p.posicion === 1)!;
    expect(r2.estado).toBe("listo");
    expect(r2.jugadorAId).toBe(a.jugadorAId);
    expect(r2.jugadorBId).toBe(b.jugadorBId);
  });

  it("permite corregir el ganador mientras la ronda siguiente no se jugó", () => {
    const p1 = base.find((p) => p.ronda === 1 && p.posicion === 1)!;
    let c = avanzarGanador(base, 1, 1, p1.jugadorAId!);
    c = avanzarGanador(c, 1, 1, p1.jugadorBId!);
    expect(c.find((p) => p.ronda === 2 && p.posicion === 1)!.jugadorAId).toBe(p1.jugadorBId);
  });

  it("no deja corregir si el partido siguiente ya se jugó", () => {
    let c = base;
    const a = c.find((p) => p.ronda === 1 && p.posicion === 1)!;
    const b = c.find((p) => p.ronda === 1 && p.posicion === 2)!;
    c = avanzarGanador(c, 1, 1, a.jugadorAId!);
    c = avanzarGanador(c, 1, 2, b.jugadorAId!);
    c = avanzarGanador(c, 2, 1, a.jugadorAId!);
    expect(() => avanzarGanador(c, 1, 1, a.jugadorBId!)).toThrow(/ya se jugó/);
  });

  it("guarda el marcador; empatado vale cualquiera de los dos (penales)", () => {
    const p1 = base.find((p) => p.ronda === 1 && p.posicion === 1)!;
    const c = avanzarGanador(base, 1, 1, p1.jugadorBId!, { a: 1, b: 1 });
    const jugado = c.find((p) => p.ronda === 1 && p.posicion === 1)!;
    expect([jugado.marcadorA, jugado.marcadorB, jugado.ganadorId]).toEqual([1, 1, p1.jugadorBId]);
    expect(fueAPenales(jugado)).toBe(true);
    const sinEmpate = avanzarGanador(base, 1, 1, p1.jugadorAId!, { a: 3, b: 0 });
    expect(fueAPenales(sinEmpate.find((p) => p.ronda === 1 && p.posicion === 1)!)).toBe(false);
  });

  it("rechaza un marcador que no cierra con el ganador o fuera de rango", () => {
    const p1 = base.find((p) => p.ronda === 1 && p.posicion === 1)!;
    expect(() => avanzarGanador(base, 1, 1, p1.jugadorAId!, { a: 0, b: 2 })).toThrow(/más goles/);
    expect(() => avanzarGanador(base, 1, 1, p1.jugadorBId!, { a: 4, b: 3 })).toThrow(/más goles/);
    expect(() => avanzarGanador(base, 1, 1, p1.jugadorAId!, { a: -1, b: 0 })).toThrow(/de 0 a 99/);
    expect(() => avanzarGanador(base, 1, 1, p1.jugadorAId!, { a: 100, b: 0 })).toThrow(/de 0 a 99/);
    expect(() => avanzarGanador(base, 1, 1, p1.jugadorAId!, { a: 1.5, b: 0 })).toThrow(/de 0 a 99/);
  });

  it("re-cargar el mismo partido con otro marcador lo pisa sin mover a nadie", () => {
    const p1 = base.find((p) => p.ronda === 1 && p.posicion === 1)!;
    let c = avanzarGanador(base, 1, 1, p1.jugadorAId!, { a: 2, b: 1 });
    c = avanzarGanador(c, 1, 1, p1.jugadorAId!, { a: 5, b: 4 });
    const jugado = c.find((p) => p.ronda === 1 && p.posicion === 1)!;
    expect([jugado.marcadorA, jugado.marcadorB]).toEqual([5, 4]);
    expect(c.find((p) => p.ronda === 2 && p.posicion === 1)!.jugadorAId).toBe(p1.jugadorAId);
  });

  it("corregir el ganador con la ronda siguiente 'lista' (sin jugar) cambia quién pasa", () => {
    const a = base.find((p) => p.ronda === 1 && p.posicion === 1)!;
    const b = base.find((p) => p.ronda === 1 && p.posicion === 2)!;
    let c = avanzarGanador(base, 1, 1, a.jugadorAId!, { a: 1, b: 0 });
    c = avanzarGanador(c, 1, 2, b.jugadorAId!, { a: 2, b: 0 });
    expect(c.find((p) => p.ronda === 2 && p.posicion === 1)!.estado).toBe("listo");
    c = avanzarGanador(c, 1, 1, a.jugadorBId!, { a: 1, b: 3 });
    const r2 = c.find((p) => p.ronda === 2 && p.posicion === 1)!;
    expect(r2.jugadorAId).toBe(a.jugadorBId);
    expect(r2.jugadorBId).toBe(b.jugadorAId);
    expect(r2.estado).toBe("listo");
  });

  it("la final se puede corregir (no hay ronda siguiente)", () => {
    const { partidos } = sortearTorneo({ jugadorIds: ["a", "b"], equipoIds: ["e1", "e2"], semilla: "z" });
    const f = partidos[0];
    let c = avanzarGanador(partidos, 1, 1, f.jugadorAId!, { a: 2, b: 1 });
    c = avanzarGanador(c, 1, 1, f.jugadorBId!, { a: 2, b: 2 });
    expect(calcularPodio(c).campeonId).toBe(f.jugadorBId);
  });

  it("rechaza ganador ajeno, partido sin definir y bye", () => {
    expect(() => avanzarGanador(base, 1, 1, "intruso")).toThrow(/uno de los dos/);
    expect(() => avanzarGanador(base, 2, 1, "j1")).toThrow(/Todavía no están/);
    const con13 = sortearTorneo({ jugadorIds: ids("j", 13), equipoIds: ids("e", 20), semilla: "b" }).partidos;
    const bye = con13.find((p) => p.esBye)!;
    expect(() => avanzarGanador(con13, 1, bye.posicion, bye.jugadorAId!)).toThrow(/pase directo/);
  });
});

describe("torneo completo", () => {
  it("16 jugadores: se juega hasta el podio", () => {
    const { partidos } = sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 20), semilla: "x" });
    expect(torneoTerminado(partidos)).toBe(false);
    const fin = jugarTodo(partidos);
    expect(fin.every((p) => p.estado === "jugado")).toBe(true);
    const podio = calcularPodio(fin);
    expect(podio.campeonId).not.toBeNull();
    expect(podio.subcampeonId).not.toBeNull();
    expect(podio.tercerosIds).toHaveLength(2);
    expect(new Set([podio.campeonId, podio.subcampeonId, ...podio.tercerosIds]).size).toBe(4);
    expect(torneoTerminado(fin)).toBe(true);
  });

  it("13 jugadores con byes también llega al campeón", () => {
    const { partidos } = sortearTorneo({ jugadorIds: ids("j", 13), equipoIds: ids("e", 20), semilla: "b" });
    const fin = jugarTodo(partidos);
    expect(calcularPodio(fin).campeonId).not.toBeNull();
  });

  it("2 jugadores: campeón y subcampeón, sin terceros", () => {
    const { partidos } = sortearTorneo({ jugadorIds: ["a", "b"], equipoIds: ["e1", "e2"], semilla: "z" });
    const podio = calcularPodio(jugarTodo(partidos));
    expect(podio.campeonId).not.toBeNull();
    expect(podio.tercerosIds).toEqual([]);
  });
});

describe("cupo", () => {
  const pagado = (orden: number) => ({ estadoPago: "pagado" as const, ordenPago: orden });
  const pendiente = { estadoPago: "pendiente" as const, ordenPago: null };

  it("cuenta solo los pagados y avisa cuando está lleno", () => {
    const quince = [...Array.from({ length: 15 }, (_, i) => pagado(i + 1)), pendiente, pendiente];
    expect(resumenCupo(quince, 16)).toEqual({ pagados: 15, cupo: 16, lugaresLibres: 1, lleno: false, enEspera: 0 });
    const dieciseis = [...quince, pagado(16)];
    expect(resumenCupo(dieciseis, 16).lleno).toBe(true);
  });

  it("con el cupo lleno, los que no pagaron son la lista de espera", () => {
    const lleno = [...Array.from({ length: 16 }, (_, i) => pagado(i + 1)), pendiente, pendiente, pendiente];
    expect(resumenCupo(lleno, 16).enEspera).toBe(3);
  });

  it("el próximo orden de pago sigue al máximo; null si está lleno", () => {
    expect(siguienteOrdenPago([pendiente], 16)).toBe(1);
    expect(siguienteOrdenPago([pagado(1), pagado(2), pendiente], 16)).toBe(3);
    const lleno = Array.from({ length: 16 }, (_, i) => pagado(i + 1));
    expect(siguienteOrdenPago(lleno, 16)).toBeNull();
  });

  it("deshacer un pago libera el lugar", () => {
    const lleno = Array.from({ length: 16 }, (_, i) => pagado(i + 1));
    lleno[3] = pendiente as never;
    expect(resumenCupo(lleno, 16).lleno).toBe(false);
    expect(siguienteOrdenPago(lleno, 16)).toBe(17);
  });
});

describe("nombresCortosUnicos", () => {
  it("deja el formato corto si no hay repetidos", () => {
    expect(nombresCortosUnicos(["Juan Pérez", "Ana Gómez", "Lucas"])).toEqual(["Juan P.", "Ana G.", "Lucas"]);
  });

  it("suma letras del apellido cuando dos coinciden", () => {
    expect(nombresCortosUnicos(["Juan Pérez", "Juan Paz"])).toEqual(["Juan Pé.", "Juan Pa."]);
  });

  it("numera a los idénticos", () => {
    expect(nombresCortosUnicos(["Juan Pérez", "Juan Pérez"])).toEqual(["Juan Pérez (1)", "Juan Pérez (2)"]);
  });
});

describe("alias", () => {
  it("limpia espacios de los bordes y repetidos", () => {
    expect(limpiarAlias("  El   Turco ")).toBe("El Turco");
  });

  it("acepta letras con acentos, números, espacio y . _ -", () => {
    for (const ok of ["Pipe", "Mati10", "El Turco", "Ñoño", "José_7", "agus.9", "Eze-M", "ab"]) {
      expect(errorAlias(ok), ok).toBeNull();
    }
  });

  it("rechaza vacío, muy corto, muy largo y caracteres raros", () => {
    expect(errorAlias("")).toMatch(/al menos 2/);
    expect(errorAlias("P")).toMatch(/al menos 2/);
    expect(errorAlias("a".repeat(21))).toMatch(/hasta 20/);
    expect(errorAlias("a".repeat(20))).toBeNull();
    for (const malo of ["<script>", "pipe@mail", "http://x", "Pipe 😎", "Pipe!"]) {
      expect(errorAlias(malo), malo).toMatch(/solo puede llevar/);
    }
  });
});

describe("nombresPublicos", () => {
  it("usa el alias y nunca el nombre completo", () => {
    expect(
      nombresPublicos([
        { nombre: "Juan Pérez", alias: "Pipe" },
        { nombre: "Ana Gómez", alias: " Anita  G " },
      ]),
    ).toEqual(["Pipe", "Anita G"]);
  });

  it("sin alias (filas viejas) cae al nombre corto, desambiguado entre ellos", () => {
    expect(
      nombresPublicos([
        { nombre: "Juan Pérez", alias: null },
        { nombre: "Juan Paz", alias: "" },
        { nombre: "Lucas Gómez", alias: "Lucky" },
      ]),
    ).toEqual(["Juan Pé.", "Juan Pa.", "Lucky"]);
  });

  it("dos alias iguales sin mirar mayúsculas: el segundo lleva (2), el tercero (3)", () => {
    expect(
      nombresPublicos([
        { nombre: "A A", alias: "Pipe" },
        { nombre: "B B", alias: "pipe" },
        { nombre: "C C", alias: "Mati" },
        { nombre: "D D", alias: "PIPE" },
      ]),
    ).toEqual(["Pipe", "pipe (2)", "Mati", "PIPE (3)"]);
  });

  it("un alias que coincide con el nombre corto de una fila vieja también se desambigua", () => {
    expect(
      nombresPublicos([
        { nombre: "Juan Pérez", alias: null },
        { nombre: "Otro", alias: "juan p." },
      ]),
    ).toEqual(["Juan P.", "juan p. (2)"]);
  });
});

describe("reveal en dos fases", () => {
  const r16 = sortearTorneo({ jugadorIds: ids("j", 16), equipoIds: ids("e", 24), semilla: "x" });
  const r13 = sortearTorneo({ jugadorIds: ids("j", 13), equipoIds: ids("e", 24), semilla: "x" });
  const nueva = `${SEMILLA_DOS_FASES}abc`;

  it("la ruleta muestra a los jugadores en el orden del sorteo, que es el de los cruces", () => {
    const orden = ordenRuleta(r16.partidos);
    expect(orden).toHaveLength(16);
    const porSorteo = [...r16.asignaciones].sort((a, b) => a.posicionSorteo - b.posicionSorteo).map((a) => a.jugadorId);
    expect(orden).toEqual(porSorteo);
    // Con byes, el cruce de pase directo aporta un solo jugador.
    expect(ordenRuleta(r13.partidos)).toHaveLength(13);
  });

  it("16 jugadores: 16 pasos de equipos y 8 de cruces, total 24", () => {
    expect(revealDesdePaso(0, 16, 8)).toMatchObject({ total: 24, fase: "equipos", equiposVistos: 0, crucesVistos: 0 });
    expect(revealDesdePaso(5, 16, 8)).toMatchObject({ fase: "equipos", equiposVistos: 5, crucesVistos: 0 });
    expect(revealDesdePaso(16, 16, 8)).toMatchObject({ fase: "cruces", equiposVistos: 16, crucesVistos: 0 });
    expect(revealDesdePaso(19, 16, 8)).toMatchObject({ fase: "cruces", equiposVistos: 16, crucesVistos: 3 });
    expect(revealDesdePaso(24, 16, 8)).toMatchObject({ fase: "completo", completo: true, crucesVistos: 8 });
    expect(revealDesdePaso(99, 16, 8).paso).toBe(24);
    expect(revealDesdePaso(-3, 16, 8).paso).toBe(0);
  });

  it("un sorteo nuevo guarda pasos de dos fases y se completa en jugadores + cruces", () => {
    expect(topeRevealGuardado(nueva, 16, 8)).toBe(24);
    expect(leerReveal(10, nueva, 16, 8)).toMatchObject({ paso: 10, fase: "equipos" });
    expect(leerReveal(24, nueva, 16, 8).completo).toBe(true);
    expect(leerReveal(8, nueva, 16, 8).completo).toBe(false);
  });

  it("un sorteo de antes (semilla sin prefijo) contaba solo cruces: los equipos se dan por vistos", () => {
    const vieja = "5f0c6d7e-0000-4000-8000-000000000000";
    expect(topeRevealGuardado(vieja, 16, 8)).toBe(8);
    expect(topeRevealGuardado(null, 16, 8)).toBe(8);
    // Ya revelado del todo con la regla vieja: sigue completo, el cuadro no se esconde.
    expect(leerReveal(8, vieja, 16, 8)).toMatchObject({ paso: 24, completo: true });
    // A medio revelar: quedan los cruces que faltaban, sin ruleta.
    expect(leerReveal(3, vieja, 16, 8)).toMatchObject({ paso: 19, fase: "cruces", crucesVistos: 3 });
    expect(leerReveal(0, vieja, 16, 8)).toMatchObject({ paso: 16, fase: "cruces", crucesVistos: 0 });
  });
});
