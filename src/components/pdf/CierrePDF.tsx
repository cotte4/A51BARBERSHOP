import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles, colors } from "./pdf-styles";

// ——————————————————————————————
// Tipos
// ——————————————————————————————

export type ResumenBarberoCierrePDF = {
  nombre: string;
  cortes: number;
  totalBruto: number;
  comisionCalculada: number;
  alquilerBancoDiario: number;
  aporteCasaServicios: number;
  ingresoNetoServicios: number;
};

export type CierrePDFData = {
  fecha: string; // "YYYY-MM-DD"
  // Totales por medio de pago
  totalEfectivo: number;
  totalMp: number;
  totalTransferencia: number;
  totalPosnet: number;
  // Totales generales
  totalBruto: number;
  totalComisionesMedios: number;
  totalNeto: number;
  totalProductos: number;
  // Caja neta y aporte
  cajaNetaDia: number;
  cajaNetaServicios: number;
  cajaNetaProductos: number;
  aporteEconomicoCasaDia: number;
  aporteCasaServicios: number;
  margenProductos: number;
  alquilerBancoDevengadoDia: number;
  // Por barbero
  barberos: Record<string, ResumenBarberoCierrePDF>;
  cantidadAtenciones: number;
};

// ——————————————————————————————
// Helpers
// ——————————————————————————————

function ars(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatFechaLarga(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const diasSemana = [
    "domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado",
  ];
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  const diaSemana = diasSemana[d.getDay()];
  return `${diaSemana} ${day} de ${meses[(month ?? 1) - 1]} de ${year}`;
}

function formatFechaEmision(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${day} de ${meses[(month ?? 1) - 1]} de ${year}`;
}

// ——————————————————————————————
// Componente
// ——————————————————————————————

export function CierrePDF({ data }: { data: CierrePDFData }) {
  const {
    fecha,
    totalEfectivo,
    totalMp,
    totalTransferencia,
    totalPosnet,
    totalBruto,
    totalComisionesMedios,
    totalNeto,
    totalProductos,
    cajaNetaDia,
    cajaNetaServicios,
    cajaNetaProductos,
    aporteEconomicoCasaDia,
    aporteCasaServicios,
    margenProductos,
    alquilerBancoDevengadoDia,
    barberos,
    cantidadAtenciones,
  } = data;

  const hoy = new Date().toISOString().split("T")[0]!;
  const mediosPagoRows = [
    { nombre: "Efectivo", total: totalEfectivo },
    { nombre: "Mercado Pago", total: totalMp },
    { nombre: "Transferencia", total: totalTransferencia },
    { nombre: "Posnet", total: totalPosnet },
  ].filter((m) => m.total > 0);

  const barberosList = Object.values(barberos);

  return (
    <Document
      title={`Cierre de caja - ${fecha}`}
      author="A51 Barber"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Cabecera */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerTitle}>A51 Barber — Cierre de Caja</Text>
          <Text style={pdfStyles.headerSubtitle}>{formatFechaLarga(fecha)}</Text>
          <Text style={pdfStyles.headerMeta}>
            Generado el {formatFechaEmision(hoy)} — {cantidadAtenciones} atenciones
          </Text>
        </View>

        {/* Resumen por medio de pago */}
        {mediosPagoRows.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Por medio de pago</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 2 }]}>Medio</Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
                  Total bruto
                </Text>
              </View>
              {mediosPagoRows.map((medio, idx) => (
                <View
                  key={medio.nombre}
                  style={idx % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt}
                >
                  <Text style={[pdfStyles.tableCell, { flex: 2 }]}>{medio.nombre}</Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 1 }]}>
                    {ars(medio.total)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Totales generales */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Totales del dia</Text>

          <View style={pdfStyles.subtotalRow}>
            <Text style={pdfStyles.subtotalLabel}>Total bruto del dia</Text>
            <Text style={pdfStyles.subtotalValue}>{ars(totalBruto)}</Text>
          </View>

          {totalComisionesMedios > 0 && (
            <View style={pdfStyles.subtotalRow}>
              <Text style={[pdfStyles.subtotalLabel, { color: colors.negative }]}>
                (-) Comisiones medios de pago
              </Text>
              <Text style={[pdfStyles.subtotalValue, { color: colors.negative }]}>
                -{ars(totalComisionesMedios)}
              </Text>
            </View>
          )}

          <View style={pdfStyles.dividerRow} />

          <View style={pdfStyles.subtotalRow}>
            <Text style={pdfStyles.subtotalLabelBold}>Caja neta del dia</Text>
            <Text style={pdfStyles.subtotalValueBold}>{ars(totalNeto)}</Text>
          </View>

          <View style={[pdfStyles.subtotalRow, { marginTop: 4 }]}>
            <Text style={pdfStyles.subtotalLabel}>
              Servicios netos
            </Text>
            <Text style={pdfStyles.subtotalValue}>{ars(cajaNetaServicios)}</Text>
          </View>

          {totalProductos > 0 && (
            <View style={pdfStyles.subtotalRow}>
              <Text style={pdfStyles.subtotalLabel}>Productos (neto)</Text>
              <Text style={pdfStyles.subtotalValue}>{ars(cajaNetaProductos)}</Text>
            </View>
          )}
        </View>

        {/* Por barbero */}
        {barberosList.length > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Desglose por barbero</Text>
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 2 }]}>Barbero</Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 0.8, textAlign: "right" }]}>
                  Cortes
                </Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1.2, textAlign: "right" }]}>
                  Bruto
                </Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1.2, textAlign: "right" }]}>
                  Comision
                </Text>
              </View>
              {barberosList.map((barbero, idx) => (
                <View
                  key={barbero.nombre}
                  style={idx % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt}
                >
                  <Text style={[pdfStyles.tableCell, { flex: 2 }]}>{barbero.nombre}</Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 0.8 }]}>
                    {barbero.cortes}
                  </Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 1.2 }]}>
                    {ars(barbero.totalBruto)}
                  </Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 1.2 }]}>
                    {ars(barbero.comisionCalculada)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Aporte economico casa */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Aporte economico casa</Text>

          {aporteCasaServicios > 0 && (
            <View style={pdfStyles.subtotalRow}>
              <Text style={pdfStyles.subtotalLabel}>Aporte por servicios</Text>
              <Text style={pdfStyles.subtotalValue}>{ars(aporteCasaServicios)}</Text>
            </View>
          )}

          {margenProductos > 0 && (
            <View style={pdfStyles.subtotalRow}>
              <Text style={pdfStyles.subtotalLabel}>Margen por productos</Text>
              <Text style={pdfStyles.subtotalValue}>{ars(margenProductos)}</Text>
            </View>
          )}

          {alquilerBancoDevengadoDia > 0 && (
            <View style={pdfStyles.subtotalRow}>
              <Text style={pdfStyles.subtotalLabel}>Alquiler banco devengado del dia</Text>
              <Text style={pdfStyles.subtotalValue}>{ars(alquilerBancoDevengadoDia)}</Text>
            </View>
          )}

          <View style={pdfStyles.dividerRow} />

          <View style={pdfStyles.subtotalRow}>
            <Text style={pdfStyles.subtotalLabelBold}>Total aporte economico casa</Text>
            <Text style={[pdfStyles.subtotalValueBold, { color: colors.positive }]}>
              {ars(aporteEconomicoCasaDia)}
            </Text>
          </View>
        </View>

        {/* Pie */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            A51 Barber — Cierre del {formatFechaEmision(fecha)} — Solo de caracter informativo
          </Text>
        </View>
      </Page>
    </Document>
  );
}
