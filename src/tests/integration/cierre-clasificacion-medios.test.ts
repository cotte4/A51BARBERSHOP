import { describe, it, expect } from "vitest";
import { clasificarTotalesPorMedio } from "@/lib/caja-finance";

describe("cierre: clasificarTotalesPorMedio", () => {
  it("efectivo va a totalEfectivo", () => {
    const r = clasificarTotalesPorMedio({ efectivo: 1000 });
    expect(r.totalEfectivo).toBe(1000);
    expect(r.totalMp).toBe(0);
    expect(r.totalTransferencia).toBe(0);
    expect(r.totalPosnet).toBe(0);
  });

  it("transferencia va a totalTransferencia", () => {
    const r = clasificarTotalesPorMedio({ transferencia: 500 });
    expect(r.totalTransferencia).toBe(500);
  });

  it("variantes de mercado pago van a totalMp", () => {
    const r = clasificarTotalesPorMedio({
      "mercado pago": 100,
      mercadopago: 200,
      mp: 300,
      "link de pago": 400,
    });
    expect(r.totalMp).toBe(1000);
    expect(r.totalEfectivo).toBe(0);
    expect(r.totalTransferencia).toBe(0);
    expect(r.totalPosnet).toBe(0);
  });

  it("variantes de posnet/tarjeta/debito/credito van a totalPosnet", () => {
    const r = clasificarTotalesPorMedio({
      posnet: 100,
      tarjeta: 200,
      "débito": 50,
      "crédito": 50,
      debito: 25,
      credito: 25,
    });
    expect(r.totalPosnet).toBe(450);
  });

  it("nombre desconocido/renombrado cae en transferencia (bucket residual)", () => {
    const r = clasificarTotalesPorMedio({
      "billetera nueva": 777,
      transferencia: 100,
    });
    expect(r.totalTransferencia).toBe(877);
  });

  it("case-insensitive y con espacios: EFECTIVO, ' Posnet ' matchean igual", () => {
    const r = clasificarTotalesPorMedio({
      EFECTIVO: 100,
      " Posnet ": 200,
      "MERCADO PAGO": 300,
    });
    expect(r.totalEfectivo).toBe(100);
    expect(r.totalPosnet).toBe(200);
    expect(r.totalMp).toBe(300);
  });

  it("la suma de los buckets siempre es igual a la suma de los inputs", () => {
    const input = {
      efectivo: 111.11,
      transferencia: 222.22,
      mp: 333.33,
      posnet: 444.44,
      "billetera x": 55.55,
    };
    const r = clasificarTotalesPorMedio(input);
    const sumaInput = Object.values(input).reduce((a, b) => a + b, 0);
    const sumaBuckets = r.totalEfectivo + r.totalMp + r.totalTransferencia + r.totalPosnet;
    expect(sumaBuckets).toBeCloseTo(sumaInput, 5);
  });

  it("input vacío devuelve todos los buckets en cero", () => {
    const r = clasificarTotalesPorMedio({});
    expect(r).toEqual({
      totalEfectivo: 0,
      totalMp: 0,
      totalTransferencia: 0,
      totalPosnet: 0,
    });
  });
});
