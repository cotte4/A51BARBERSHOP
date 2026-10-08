import { describe, expect, it } from "vitest";
import { resolverPedido, type EstadoCola, type EstadoPropuesta } from "@/lib/jukebox-pedido";

const propuesta = (status: EstadoPropuesta) => ({ videoTitle: "Tema", status });
const fila = (state: EstadoCola, positionHint: number) => ({ state, positionHint });

describe("resolverPedido sin fila en la cola", () => {
  it("pendiente: en revisión", () => {
    expect(resolverPedido(propuesta("pending"), null, [])).toEqual({
      videoTitle: "Tema",
      estado: "en_revision",
      lugar: null,
    });
  });

  it("rechazada: no entró", () => {
    expect(resolverPedido(propuesta("rejected"), null, []).estado).toBe("no_entro");
  });

  it("played sin fila: ya sonó", () => {
    expect(resolverPedido(propuesta("played"), null, []).estado).toBe("ya_sono");
  });

  it("aprobada sin fila todavía: en cola al final", () => {
    const r = resolverPedido(propuesta("approved"), null, [fila("playing", 1), fila("queued", 2)]);
    expect(r).toMatchObject({ estado: "en_cola", lugar: 2 });
  });
});

describe("resolverPedido con fila en la cola", () => {
  it("la fila sonando manda aunque la propuesta ya diga played", () => {
    const item = fila("playing", 3);
    expect(resolverPedido(propuesta("played"), item, [item, fila("queued", 4)]).estado).toBe("sonando");
  });

  it("en cola: cuenta los de adelante más el que suena", () => {
    const item = fila("queued", 5);
    const activos = [fila("playing", 2), fila("queued", 3), fila("queued", 4), item, fila("queued", 6)];
    expect(resolverPedido(propuesta("approved"), item, activos)).toMatchObject({ estado: "en_cola", lugar: 3 });
  });

  it("primera en la cola detrás del que suena: lugar 1", () => {
    const item = fila("queued", 2);
    expect(resolverPedido(propuesta("approved"), item, [fila("playing", 1), item]).lugar).toBe(1);
  });

  it("terminó de sonar: ya sonó", () => {
    expect(resolverPedido(propuesta("played"), fila("played", 1), []).estado).toBe("ya_sono");
  });

  it("quitada por Pinky o saltada: no entró", () => {
    expect(resolverPedido(propuesta("approved"), fila("skipped", 1), []).estado).toBe("no_entro");
    expect(resolverPedido(propuesta("played"), fila("skipped", 1), []).estado).toBe("no_entro");
  });
});
