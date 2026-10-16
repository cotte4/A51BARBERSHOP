import { describe, expect, it } from "vitest";
import {
  decidirJukebox,
  VENTANA_ENVIO_MS,
  VIDA_MAXIMA_MS,
  type Decision,
  type ItemVivo,
  type Reproduccion,
} from "@/lib/jukebox-decidir";

const AHORA = new Date("2026-10-15T20:00:00.000Z");
const SEG = 1000;
const MIN = 60 * SEG;
const HORA = 60 * MIN;

/** Una fecha `ms` milisegundos antes de AHORA. */
const hace = (ms: number) => new Date(AHORA.getTime() - ms);

/** Item en cola, sin mandar, con uri propia (spotify:track:<id>), creado hace 1 minuto. */
const item = (id: string, extra: Partial<ItemVivo> = {}): ItemVivo => ({
  id,
  estado: "queued",
  uri: `spotify:track:${id}`,
  posicion: 1,
  enviadoEn: null,
  empezoEn: null,
  duracionSegundos: 200,
  creadoEn: hace(MIN),
  ...extra,
});

/** Item que ya está sonando (estado "playing"). */
const sonandoItem = (id: string, extra: Partial<ItemVivo> = {}): ItemVivo =>
  item(id, { estado: "playing", empezoEn: hace(30 * SEG), ...extra });

/** Item ya mandado a Spotify (queued con enviadoEn). */
const enviadoItem = (id: string, enviadoHace: number, extra: Partial<ItemVivo> = {}): ItemVivo =>
  item(id, { enviadoEn: hace(enviadoHace), ...extra });

/** Lo que tiene cargado Spotify (no null). */
const repro = (uri: string | null, extra: Partial<NonNullable<Reproduccion>> = {}): Reproduccion => ({
  uri,
  sonando: true,
  progresoMs: 10 * SEG,
  duracionMs: 200 * SEG,
  ...extra,
});

const decidir = (
  items: ItemVivo[],
  reproduccion: Reproduccion,
  hayDispositivo = true,
  ahora: Date = AHORA,
): Decision => decidirJukebox({ items, reproduccion, hayDispositivo, ahora });

const SIN_CAMBIOS: Decision = { empieza: null, terminan: [], descartan: [], enviar: null, terminanSiArranca: [] };

describe("decidirJukebox con la cola vacía", () => {
  it("no hace nada", () => {
    expect(decidir([], null)).toEqual(SIN_CAMBIOS);
    expect(decidir([], repro("spotify:track:lista-del-local"))).toEqual(SIN_CAMBIOS);
  });
});

describe("decidirJukebox con nada cargado en Spotify", () => {
  it("con dispositivo: manda el primero en modo arrancar", () => {
    const r = decidir([item("a")], null, true);
    expect(r.enviar).toEqual({ id: "a", uri: "spotify:track:a", modo: "arrancar" });
    expect(r.empieza).toBeNull();
    expect(r.terminan).toEqual([]);
    expect(r.descartan).toEqual([]);
  });

  it("sin dispositivo: no manda nada", () => {
    expect(decidir([item("a")], null, false)).toEqual(SIN_CAMBIOS);
  });

  it("uri null en Spotify también cuenta como nada puesto", () => {
    const r = decidir([item("a")], repro(null), true);
    expect(r.enviar).toEqual({ id: "a", uri: "spotify:track:a", modo: "arrancar" });
  });

  it("una sola lectura vacía con uno nuestro sonando no corta nada (puede ser un parpadeo)", () => {
    const r = decidir([sonandoItem("viejo"), item("a", { posicion: 2 })], null, true);
    expect(r).toEqual(SIN_CAMBIOS);
  });

  it("dos lecturas vacías seguidas: arranca el próximo y el viejo termina solo si arranca", () => {
    const r = decidirJukebox({
      items: [sonandoItem("viejo"), item("a", { posicion: 2 })],
      reproduccion: null,
      hayDispositivo: true,
      ahora: AHORA,
      anteriorVacia: true,
    });
    expect(r.enviar).toEqual({ id: "a", uri: "spotify:track:a", modo: "arrancar" });
    expect(r.terminan).toEqual([]);
    expect(r.terminanSiArranca).toEqual(["viejo"]);
  });
});

describe("decidirJukebox con un tema de relleno sonando (no es de la cola)", () => {
  it("manda el próximo enseguida en modo cola, sin esperar al final", () => {
    const r = decidir([item("a")], repro("spotify:track:relleno", { progresoMs: 10 * SEG, duracionMs: 300 * SEG }));
    expect(r.enviar).toEqual({ id: "a", uri: "spotify:track:a", modo: "cola" });
    expect(r.empieza).toBeNull();
    expect(r.terminan).toEqual([]);
  });
});

describe("decidirJukebox con un tema nuestro sonando", () => {
  const nuestro = () => sonandoItem("a", { duracionSegundos: 200 });
  const siguiente = () => item("b", { posicion: 2 });

  it("con más de 45 s por delante: no manda nada", () => {
    const r = decidir(
      [nuestro(), siguiente()],
      repro("spotify:track:a", { progresoMs: 100 * SEG, duracionMs: 200 * SEG }),
    );
    expect(r).toEqual(SIN_CAMBIOS);
  });

  it("apenas por encima de la ventana: todavía no manda", () => {
    const r = decidir(
      [nuestro(), siguiente()],
      repro("spotify:track:a", { progresoMs: 200 * SEG - VENTANA_ENVIO_MS - 1, duracionMs: 200 * SEG }),
    );
    expect(r.enviar).toBeNull();
  });

  it("con 45 s justos por delante: manda el siguiente en modo cola", () => {
    const r = decidir(
      [nuestro(), siguiente()],
      repro("spotify:track:a", { progresoMs: 200 * SEG - VENTANA_ENVIO_MS, duracionMs: 200 * SEG }),
    );
    expect(r.enviar).toEqual({ id: "b", uri: "spotify:track:b", modo: "cola" });
    expect(r.terminan).toEqual([]);
  });

  it("con menos de 45 s por delante: manda el siguiente en modo cola", () => {
    const r = decidir(
      [nuestro(), siguiente()],
      repro("spotify:track:a", { progresoMs: 160 * SEG, duracionMs: 200 * SEG }),
    );
    expect(r.enviar).toEqual({ id: "b", uri: "spotify:track:b", modo: "cola" });
  });
});

describe("decidirJukebox con Spotify en pausa", () => {
  it("con un tema de relleno en pausa: no manda nada", () => {
    expect(decidir([item("a")], repro("spotify:track:relleno", { sonando: false }))).toEqual(SIN_CAMBIOS);
  });

  it("con un tema nuestro en pausa al final: no manda nada y no lo termina", () => {
    const r = decidir(
      [sonandoItem("a"), item("b", { posicion: 2 })],
      repro("spotify:track:a", { sonando: false, progresoMs: 190 * SEG, duracionMs: 200 * SEG }),
    );
    expect(r).toEqual(SIN_CAMBIOS);
  });
});

describe("decidirJukebox cuando un tema mandado pasa a sonar", () => {
  it("el mandado que suena empieza y el que figuraba sonando termina", () => {
    const r = decidir(
      [sonandoItem("viejo"), enviadoItem("nuevo", 2 * MIN, { posicion: 2 })],
      repro("spotify:track:nuevo"),
    );
    expect(r.empieza).toBe("nuevo");
    expect(r.terminan).toEqual(["viejo"]);
    expect(r.descartan).toEqual([]);
    expect(r.enviar).toBeNull();
  });

  it("los mandados antes que él también terminan (Spotify los toca en orden)", () => {
    const r = decidir(
      [
        sonandoItem("viejo"),
        enviadoItem("segundo", 3 * MIN, { posicion: 3 }),
        enviadoItem("primero", 5 * MIN, { posicion: 2 }),
        enviadoItem("tercero", 1 * MIN, { posicion: 4 }),
      ],
      repro("spotify:track:segundo"),
    );
    expect(r.empieza).toBe("segundo");
    expect([...r.terminan].sort()).toEqual(["primero", "viejo"]);
    expect(r.terminan).not.toContain("tercero");
    // "tercero" sigue mandado y pendiente: no se manda otro encima.
    expect(r.enviar).toBeNull();
  });

  it("sin ningún item sonando antes: solo empieza el que arrancó", () => {
    const r = decidir([enviadoItem("nuevo", 1 * MIN)], repro("spotify:track:nuevo"));
    expect(r).toEqual({ empieza: "nuevo", terminan: [], descartan: [], enviar: null, terminanSiArranca: [] });
  });

  it("el que acaba de empezar cuenta como nuestro: el siguiente espera a la ventana", () => {
    const items = [enviadoItem("nuevo", 1 * MIN), item("otro", { posicion: 5 })];
    const lejos = decidir(items, repro("spotify:track:nuevo", { progresoMs: 5 * SEG, duracionMs: 200 * SEG }));
    expect(lejos.empieza).toBe("nuevo");
    expect(lejos.enviar).toBeNull();

    const cerca = decidir(items, repro("spotify:track:nuevo", { progresoMs: 170 * SEG, duracionMs: 200 * SEG }));
    expect(cerca.enviar).toEqual({ id: "otro", uri: "spotify:track:otro", modo: "cola" });
  });
});

describe("decidirJukebox cuando Spotify ya está en otro tema", () => {
  it("el nuestro que figuraba sonando termina", () => {
    const r = decidir([sonandoItem("a")], repro("spotify:track:relleno"));
    expect(r.terminan).toEqual(["a"]);
    expect(r.empieza).toBeNull();
    expect(r.enviar).toBeNull();
  });

  it("termina aunque Spotify esté en pausa en el otro tema", () => {
    const r = decidir([sonandoItem("a")], repro("spotify:track:relleno", { sonando: false }));
    expect(r.terminan).toEqual(["a"]);
  });

  it("y con uno en cola, como suena relleno, se manda enseguida", () => {
    const r = decidir([sonandoItem("a"), item("b", { posicion: 2 })], repro("spotify:track:relleno"));
    expect(r.terminan).toEqual(["a"]);
    expect(r.enviar).toEqual({ id: "b", uri: "spotify:track:b", modo: "cola" });
  });
});

describe("decidirJukebox sin saber qué suena (reproduccion null) y sin dispositivo", () => {
  const DURACION = 200;
  const margen = 3 * MIN;

  it("antes de duración + 3 min no se da por terminado", () => {
    const a = sonandoItem("a", { duracionSegundos: DURACION, empezoEn: hace(DURACION * SEG + margen - SEG) });
    expect(decidir([a], null, false)).toEqual(SIN_CAMBIOS);
  });

  it("justo en duración + 3 min todavía no (el corte es estricto)", () => {
    const a = sonandoItem("a", { duracionSegundos: DURACION, empezoEn: hace(DURACION * SEG + margen) });
    expect(decidir([a], null, false).terminan).toEqual([]);
  });

  it("pasada la duración + 3 min se da por terminado", () => {
    const a = sonandoItem("a", { duracionSegundos: DURACION, empezoEn: hace(DURACION * SEG + margen + SEG) });
    expect(decidir([a], null, false).terminan).toEqual(["a"]);
  });

  it("sin duración conocida usa 6 min + 3 min", () => {
    const antes = sonandoItem("a", { duracionSegundos: null, empezoEn: hace(9 * MIN - SEG) });
    const despues = sonandoItem("a", { duracionSegundos: null, empezoEn: hace(9 * MIN + SEG) });
    expect(decidir([antes], null, false).terminan).toEqual([]);
    expect(decidir([despues], null, false).terminan).toEqual(["a"]);
  });

  it("sin empezoEn cuenta desde que se creó", () => {
    const a = sonandoItem("a", {
      duracionSegundos: DURACION,
      empezoEn: null,
      creadoEn: hace(DURACION * SEG + margen + SEG),
    });
    expect(decidir([a], null, false).terminan).toEqual(["a"]);
  });
});

describe("decidirJukebox con temas mandados que nunca se vieron sonar", () => {
  it("pasados 12 min desde el envío se dan por terminados", () => {
    const r = decidir([enviadoItem("a", 12 * MIN + SEG)], repro("spotify:track:relleno"));
    expect(r.terminan).toEqual(["a"]);
    expect(r.empieza).toBeNull();
  });

  it("antes de los 12 min siguen pendientes", () => {
    const r = decidir([enviadoItem("a", 12 * MIN - SEG)], repro("spotify:track:relleno"));
    expect(r.terminan).toEqual([]);
  });

  it("mientras hay un mandado pendiente no se manda otro", () => {
    const r = decidir(
      [enviadoItem("a", 5 * MIN, { posicion: 1 }), item("b", { posicion: 2 })],
      repro("spotify:track:relleno"),
    );
    expect(r.enviar).toBeNull();
    expect(r.terminan).toEqual([]);
  });

  it("tampoco se manda otro en modo arrancar si hay un mandado pendiente", () => {
    const r = decidir([enviadoItem("a", 5 * MIN), item("b", { posicion: 2 })], null, true);
    expect(r.enviar).toBeNull();
  });

  it("al darse por terminado el viejo, se libera el envío del siguiente", () => {
    const r = decidir(
      [enviadoItem("a", 25 * MIN, { posicion: 1 }), item("b", { posicion: 2 })],
      repro("spotify:track:relleno"),
    );
    expect(r.terminan).toEqual(["a"]);
    expect(r.enviar).toEqual({ id: "b", uri: "spotify:track:b", modo: "cola" });
  });
});

describe("decidirJukebox con colas de hace más de 12 horas", () => {
  it("las que no se mandaron se descartan", () => {
    const r = decidir([item("ayer", { creadoEn: hace(VIDA_MAXIMA_MS + 1) })], null);
    expect(r.descartan).toEqual(["ayer"]);
    expect(r.enviar).toBeNull();
  });

  it("justo a las 12 h todavía no se descarta (el corte es estricto)", () => {
    const r = decidir([item("limite", { creadoEn: hace(VIDA_MAXIMA_MS) })], null);
    expect(r.descartan).toEqual([]);
    expect(r.enviar).toEqual({ id: "limite", uri: "spotify:track:limite", modo: "arrancar" });
  });

  it("nunca se eligen para mandar: se manda el siguiente válido aunque tenga peor posición", () => {
    const r = decidir(
      [
        item("ayer", { posicion: 1, creadoEn: hace(13 * HORA) }),
        item("hoy", { posicion: 2 }),
      ],
      null,
    );
    expect(r.descartan).toEqual(["ayer"]);
    expect(r.enviar).toEqual({ id: "hoy", uri: "spotify:track:hoy", modo: "arrancar" });
  });

  it("también se descartan cuando suena relleno y se manda el válido en modo cola", () => {
    const r = decidir(
      [
        item("ayer", { posicion: 1, creadoEn: hace(30 * HORA) }),
        item("hoy", { posicion: 2 }),
      ],
      repro("spotify:track:relleno"),
    );
    expect(r.descartan).toEqual(["ayer"]);
    expect(r.enviar).toEqual({ id: "hoy", uri: "spotify:track:hoy", modo: "cola" });
  });

  it("un tema ya mandado o sonando no se descarta por viejo", () => {
    const r = decidir(
      [
        enviadoItem("mandado", 1 * MIN, { creadoEn: hace(13 * HORA) }),
        sonandoItem("sonando", { creadoEn: hace(13 * HORA) }),
      ],
      repro("spotify:track:sonando"),
    );
    expect(r.descartan).toEqual([]);
  });
});

describe("decidirJukebox con items sin uri", () => {
  it("se saltean al elegir el próximo", () => {
    const r = decidir(
      [item("sin-uri", { posicion: 1, uri: null }), item("con-uri", { posicion: 2 })],
      null,
    );
    expect(r.enviar).toEqual({ id: "con-uri", uri: "spotify:track:con-uri", modo: "arrancar" });
    expect(r.descartan).toEqual([]);
  });

  it("si ninguno tiene uri no se manda nada", () => {
    const r = decidir([item("a", { uri: null }), item("b", { uri: null, posicion: 2 })], null);
    expect(r).toEqual(SIN_CAMBIOS);
  });
});

describe("decidirJukebox elige el próximo por posición", () => {
  it("gana la posición más baja entre los que no se mandaron, sin importar el orden de entrada", () => {
    const r = decidir(
      [
        item("c", { posicion: 7 }),
        item("a", { posicion: 2 }),
        item("b", { posicion: 5 }),
      ],
      null,
    );
    expect(r.enviar).toEqual({ id: "a", uri: "spotify:track:a", modo: "arrancar" });
  });

  it("no se queda con la posición baja de un tema que ya se mandó", () => {
    const r = decidir(
      [
        enviadoItem("mandado", 25 * MIN, { posicion: 1 }),
        item("c", { posicion: 9 }),
        item("b", { posicion: 4 }),
      ],
      repro("spotify:track:relleno"),
    );
    expect(r.enviar).toEqual({ id: "b", uri: "spotify:track:b", modo: "cola" });
  });
});

describe("decidirJukebox cuando Spotify se frenó al terminar un tema suelto", () => {
  it("uno nuestro parado al final: termina y arranca el próximo", () => {
    const r = decidir(
      [sonandoItem("a"), item("b", { posicion: 2 })],
      repro("spotify:track:a", { sonando: false, progresoMs: 199 * SEG, duracionMs: 200 * SEG }),
    );
    expect(r.terminan).toEqual(["a"]);
    expect(r.enviar).toEqual({ id: "b", uri: "spotify:track:b", modo: "arrancar" });
  });

  it("uno nuestro vuelto a cero después de su duración: también terminó", () => {
    const r = decidir(
      [sonandoItem("a", { empezoEn: hace(10 * MIN) }), item("b", { posicion: 2 })],
      repro("spotify:track:a", { sonando: false, progresoMs: 0, duracionMs: 200 * SEG }),
    );
    expect(r.terminan).toEqual(["a"]);
    expect(r.enviar?.modo).toBe("arrancar");
  });

  it("uno nuestro en pausa a cero recién empezado: es una pausa, no se toca", () => {
    const r = decidir(
      [sonandoItem("a"), item("b", { posicion: 2 })],
      repro("spotify:track:a", { sonando: false, progresoMs: 0, duracionMs: 200 * SEG }),
    );
    expect(r).toEqual(SIN_CAMBIOS);
  });

  it("la lista del local terminada: arranca la cola", () => {
    const r = decidir(
      [item("b")],
      repro("spotify:track:relleno", { sonando: false, progresoMs: 200 * SEG, duracionMs: 200 * SEG }),
    );
    expect(r.enviar).toEqual({ id: "b", uri: "spotify:track:b", modo: "arrancar" });
  });
});
