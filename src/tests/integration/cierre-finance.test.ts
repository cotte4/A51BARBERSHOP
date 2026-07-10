import { describe, it, expect } from "vitest";
import { buildCierreResumen } from "@/lib/caja-finance";

const PINKY_ID = "pinky-test-id";
const GABOTE_ID = "gabote-test-id";
const PROD_ID = "prod-test-id";
const MP_EFECTIVO_ID = "mp-efectivo-id";
const MP_QR_ID = "mp-qr-id";

const PINKY = { id: PINKY_ID, nombre: "Pinky", rol: "admin", tipoModelo: "variable" };
const GABOTE = { id: GABOTE_ID, nombre: "Gabote", rol: "barbero", tipoModelo: "hibrido" };

const MP_EFECTIVO = { id: MP_EFECTIVO_ID, comisionPorcentaje: "0" };
const MP_QR = { id: MP_QR_ID, comisionPorcentaje: "6" };

function cierre(args: Parameters<typeof buildCierreResumen>[0]) {
  return buildCierreResumen(args);
}

describe("cierre-finance: buildCierreResumen", () => {
  it("Gabote corte $13.000 efectivo → comision 60%, aporte casa 40%, sin fee", () => {
    const result = cierre({
      fecha: "2026-03-03",
      atenciones: [
        {
          barberoId: GABOTE_ID,
          precioCobrado: "13000",
          comisionBarberoMonto: "7800",
          comisionMedioPagoMonto: "0",
          montoNeto: "13000",
        },
      ],
      barberos: [GABOTE],
      ventasProductos: [],
      productos: [],
      mediosPago: [MP_EFECTIVO],
    });

    const gabote = result.barberos[GABOTE_ID];
    expect(gabote).toBeDefined();
    // formula: comision = 60% de 13000
    expect(gabote.comisionCalculada).toBe(7800);
    // aporte_casa = precio - comision_barbero - comision_mp = 13000 - 7800 - 0
    expect(gabote.aporteCasaServicios).toBe(5200);
    expect(result.totales.aporteCasaServicios).toBe(5200);
    expect(result.totales.totalServiciosComisionesMedios).toBe(0);
    expect(result.totales.cajaNetaServicios).toBe(13000);
  });

  it("Gabote corte $13.000 MP QR 6% → comision barbero no se reduce por fee", () => {
    const result = cierre({
      fecha: "2026-03-03",
      atenciones: [
        {
          barberoId: GABOTE_ID,
          precioCobrado: "13000",
          comisionBarberoMonto: "7800",    // 60% del precio bruto
          comisionMedioPagoMonto: "780",   // 6% de 13000
          montoNeto: "12220",              // 13000 - 780
        },
      ],
      barberos: [GABOTE],
      ventasProductos: [],
      productos: [],
      mediosPago: [MP_QR],
    });

    const gabote = result.barberos[GABOTE_ID];
    // comision barbero se calcula sobre precio bruto, no se reduce por el fee
    expect(gabote.comisionCalculada).toBe(7800);
    // aporte_casa = 13000 - 7800 - 780
    expect(gabote.aporteCasaServicios).toBe(4420);
    expect(result.totales.totalServiciosComisionesMedios).toBe(780);
    expect(result.totales.cajaNetaServicios).toBe(12220);
  });

  it("Pinky corte $13.000 → aporte casa = 0, ingreso neto va a Pinky", () => {
    const result = cierre({
      fecha: "2026-03-03",
      atenciones: [
        {
          barberoId: PINKY_ID,
          precioCobrado: "13000",
          comisionBarberoMonto: "13000",
          comisionMedioPagoMonto: "0",
          montoNeto: "13000",
        },
      ],
      barberos: [PINKY],
      ventasProductos: [],
      productos: [],
      mediosPago: [MP_EFECTIVO],
    });

    const pinky = result.barberos[PINKY_ID];
    // admin no aporta a la casa
    expect(pinky.aporteCasaServicios).toBe(0);
    // ingreso neto de Pinky = montoNeto
    expect(pinky.ingresoNetoServicios).toBe(13000);
    expect(result.totales.aporteCasaServicios).toBe(0);
  });

  it("Venta producto $5.000 costo $2.000 MP QR 6% → caja neta $4.700, margen $2.700", () => {
    const result = cierre({
      fecha: "2026-03-03",
      atenciones: [],
      barberos: [],
      ventasProductos: [
        {
          productoId: PROD_ID,
          // Ventas reales se guardan con cantidad NEGATIVA (ledger append-only).
          cantidad: -1,
          precioUnitario: "5000",
          medioPagoId: MP_QR_ID,
        },
      ],
      productos: [{ id: PROD_ID, costoCompra: "2000" }],
      mediosPago: [MP_QR],
    });

    expect(result.totales.totalProductosBruto).toBe(5000);
    // comision_mp = 6% de 5000
    expect(result.totales.totalProductosComisionesMedios).toBe(300);
    // caja_neta_producto = 5000 - 300
    expect(result.totales.cajaNetaProductos).toBe(4700);
    // costo total
    expect(result.totales.totalProductosCosto).toBe(2000);
    // margen = caja_neta - costo
    expect(result.totales.margenProductos).toBe(2700);
  });

  it("Atención con comisionBarberoMonto = null → aporte casa skipped, otros records no afectados", () => {
    const result = cierre({
      fecha: "2026-03-03",
      atenciones: [
        {
          // record incompleto — null skips the aporte
          barberoId: GABOTE_ID,
          precioCobrado: "13000",
          comisionBarberoMonto: null,
          comisionMedioPagoMonto: "0",
          montoNeto: "13000",
        },
        {
          // record completo — aporta normalmente
          barberoId: GABOTE_ID,
          precioCobrado: "13000",
          comisionBarberoMonto: "7800",
          comisionMedioPagoMonto: "0",
          montoNeto: "13000",
        },
      ],
      barberos: [GABOTE],
      ventasProductos: [],
      productos: [],
      mediosPago: [MP_EFECTIVO],
    });

    const gabote = result.barberos[GABOTE_ID];
    // cortes contados = 2
    expect(gabote.cortes).toBe(2);
    // comision del null record = toNumber(null) = 0; segundo = 7800
    expect(gabote.comisionCalculada).toBe(7800);
    // aporte solo del segundo record: 13000 - 7800 - 0 = 5200
    expect(gabote.aporteCasaServicios).toBe(5200);
    // aporte total no se infló por el null
    expect(result.totales.aporteCasaServicios).toBe(5200);
  });

  it("Día mixto: Pinky 3 + Gabote 2 + venta producto → caja neta y aporte económico correctos", () => {
    const pinkyAtencion = (i: number) => ({
      barberoId: PINKY_ID,
      precioCobrado: "13000",
      comisionBarberoMonto: "13000",
      comisionMedioPagoMonto: "0",
      montoNeto: "13000",
    });
    const gaboteAtencion = (i: number) => ({
      barberoId: GABOTE_ID,
      precioCobrado: "13000",
      comisionBarberoMonto: "7800",
      comisionMedioPagoMonto: "0",
      montoNeto: "13000",
    });

    const result = cierre({
      fecha: "2026-03-03",
      atenciones: [
        pinkyAtencion(1), pinkyAtencion(2), pinkyAtencion(3),
        gaboteAtencion(1), gaboteAtencion(2),
      ],
      barberos: [PINKY, GABOTE],
      ventasProductos: [
        // Ventas reales se guardan con cantidad NEGATIVA (ledger append-only).
        { productoId: PROD_ID, cantidad: -1, precioUnitario: "5000", medioPagoId: MP_EFECTIVO_ID },
      ],
      productos: [{ id: PROD_ID, costoCompra: "2000" }],
      mediosPago: [MP_EFECTIVO],
    });

    // bruto servicios: 5 cortes * 13000 = 65000
    expect(result.totales.totalServiciosBruto).toBe(65000);
    // caja neta servicios: 65000 (todos efectivo, sin fees)
    expect(result.totales.cajaNetaServicios).toBe(65000);
    // aporte casa servicios: solo Gabote 2 * (13000 - 7800) = 10400
    expect(result.totales.aporteCasaServicios).toBe(10400);
    // producto: bruto 5000, efectivo = 0 fee, margen = 5000 - 2000 = 3000
    expect(result.totales.margenProductos).toBe(3000);
    // caja neta día = 65000 + 5000
    expect(result.totales.cajaNetaDia).toBe(70000);
    // aporte económico casa = aporte servicios + margen productos
    expect(result.totales.aporteEconomicoCasaDia).toBe(10400 + 3000);
  });
});
