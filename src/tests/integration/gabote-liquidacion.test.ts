import { describe, it, expect } from "vitest";
import { buildCierreResumen } from "@/lib/caja-finance";

const GABOTE_ID = "gabote-test-id";
const GABOTE = { id: GABOTE_ID, nombre: "Gabote", rol: "barbero", tipoModelo: "hibrido" };

const MP_EFECTIVO_ID = "mp-efectivo-id";
const MP_QR_ID = "mp-qr-id";
const MP_EFECTIVO = { id: MP_EFECTIVO_ID, comisionPorcentaje: "0" };
const MP_QR = { id: MP_QR_ID, comisionPorcentaje: "6" };

describe("gabote-liquidacion: liquidación diaria de Gabote", () => {
  it("5 cortes mix efectivo + MP QR → monto_a_pagar = suma comisiones, sin arrastre ni alquiler", () => {
    // 3 cortes efectivo + 2 cortes MP QR, todos $13.000
    // comision_gabote por corte = 60% del precio bruto (no se reduce por fee de MP)
    const atenciones = [
      // cortes efectivo
      { barberoId: GABOTE_ID, precioCobrado: "13000", comisionBarberoMonto: "7800", comisionMedioPagoMonto: "0", montoNeto: "13000" },
      { barberoId: GABOTE_ID, precioCobrado: "13000", comisionBarberoMonto: "7800", comisionMedioPagoMonto: "0", montoNeto: "13000" },
      { barberoId: GABOTE_ID, precioCobrado: "13000", comisionBarberoMonto: "7800", comisionMedioPagoMonto: "0", montoNeto: "13000" },
      // cortes MP QR
      { barberoId: GABOTE_ID, precioCobrado: "13000", comisionBarberoMonto: "7800", comisionMedioPagoMonto: "780", montoNeto: "12220" },
      { barberoId: GABOTE_ID, precioCobrado: "13000", comisionBarberoMonto: "7800", comisionMedioPagoMonto: "780", montoNeto: "12220" },
    ];

    const result = buildCierreResumen({
      fecha: "2026-03-03",
      atenciones,
      barberos: [GABOTE],
      ventasProductos: [],
      productos: [],
      mediosPago: [MP_EFECTIVO, MP_QR],
    });

    const gabote = result.barberos[GABOTE_ID];
    expect(gabote.cortes).toBe(5);

    // monto_a_pagar = sum(comisionBarberoMonto) = 5 * 7800 = 39000
    expect(gabote.comisionCalculada).toBe(39000);

    // aporte_casa_gabote por cortes efectivo: 3 * (13000 - 7800 - 0) = 3 * 5200 = 15600
    // aporte_casa_gabote por cortes QR:       2 * (13000 - 7800 - 780) = 2 * 4420 = 8840
    expect(gabote.aporteCasaServicios).toBe(15600 + 8840);

    // totalBruto = 5 * 13000 = 65000
    expect(gabote.totalBruto).toBe(65000);

    // sin arrastre de días previos — el cierre sólo refleja este día
    expect(result.totales.cajaNetaDia).toBe(3 * 13000 + 2 * 12220);
  });

  it("Día sin atenciones de Gabote → comision = 0, sin error ni negativo", () => {
    const result = buildCierreResumen({
      fecha: "2026-03-10",
      atenciones: [],
      barberos: [GABOTE],
      ventasProductos: [],
      productos: [],
      mediosPago: [MP_EFECTIVO],
    });

    // Gabote no aparece en el resumen si no trabajó
    const gabote = result.barberos[GABOTE_ID];
    expect(gabote).toBeUndefined();

    // totales no negativos
    expect(result.totales.cajaNetaDia).toBe(0);
    expect(result.totales.aporteCasaServicios).toBe(0);
    expect(result.totales.aporteEconomicoCasaDia).toBe(0);
  });

  it("Precio distinto por servicio → cada corte usa su propio precio cobrado", () => {
    // Corte $13.000 y Corte+Barba $16.000
    const result = buildCierreResumen({
      fecha: "2026-03-03",
      atenciones: [
        { barberoId: GABOTE_ID, precioCobrado: "13000", comisionBarberoMonto: "7800", comisionMedioPagoMonto: "0", montoNeto: "13000" },
        { barberoId: GABOTE_ID, precioCobrado: "16000", comisionBarberoMonto: "9600", comisionMedioPagoMonto: "0", montoNeto: "16000" },
      ],
      barberos: [GABOTE],
      ventasProductos: [],
      productos: [],
      mediosPago: [MP_EFECTIVO],
    });

    const gabote = result.barberos[GABOTE_ID];
    expect(gabote.totalBruto).toBe(29000);
    // 7800 + 9600
    expect(gabote.comisionCalculada).toBe(17400);
    // (13000 - 7800) + (16000 - 9600) = 5200 + 6400
    expect(gabote.aporteCasaServicios).toBe(11600);
  });
});
