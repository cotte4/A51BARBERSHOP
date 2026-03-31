import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { colors, pdfStyles } from "./pdf-styles";

export type AtencionLiquidacionData = {
  fecha: string;
  servicio: string;
  precioCobrado: number;
  comisionBarbero: number;
};

export type LiquidacionPDFData = {
  barberoNombre: string;
  periodoInicio: string;
  periodoFin: string;
  fechaEmision: string;
  atenciones: AtencionLiquidacionData[];
  totalComisionCalculada: number;
  sueldoMinimo?: number;
  alquilerBancoCobrado?: number;
  resultadoPeriodo: number;
  montoAPagar: number;
};

function ars(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${day} ${meses[(month ?? 1) - 1]} ${year}`;
}

function formatFechaLarga(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${day} de ${meses[(month ?? 1) - 1]} de ${year}`;
}

function formatPeriodo(periodoInicio: string, periodoFin: string): string {
  if (periodoInicio === periodoFin) return formatFechaLarga(periodoInicio);
  return `${formatFechaLarga(periodoInicio)} al ${formatFechaLarga(periodoFin)}`;
}

export function LiquidacionPDF({ data }: { data: LiquidacionPDFData }) {
  const {
    barberoNombre,
    periodoInicio,
    periodoFin,
    fechaEmision,
    atenciones,
    totalComisionCalculada,
    sueldoMinimo = 0,
    alquilerBancoCobrado = 0,
    resultadoPeriodo,
    montoAPagar,
  } = data;

  const periodoPositivo = montoAPagar > 0;

  return (
    <Document title={`Liquidacion ${barberoNombre} - ${periodoInicio}`} author="A51 Barber">
      <Page size="A4" style={pdfStyles.page}>
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerTitle}>A51 Barber - Liquidacion</Text>
          <Text style={pdfStyles.headerSubtitle}>{barberoNombre}</Text>
          <Text style={pdfStyles.headerMeta}>Periodo: {formatPeriodo(periodoInicio, periodoFin)}</Text>
          <Text style={pdfStyles.headerMeta}>Fecha de emision: {formatFechaLarga(fechaEmision)}</Text>
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Atenciones del periodo</Text>

          {atenciones.length === 0 ? (
            <Text style={pdfStyles.emptyText}>Sin atenciones registradas</Text>
          ) : (
            <View style={pdfStyles.table}>
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1.2 }]}>Fecha</Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 2.5 }]}>Servicio</Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Precio</Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>Comision</Text>
              </View>

              {atenciones.map((atencion, idx) => (
                <View key={idx} style={idx % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt}>
                  <Text style={[pdfStyles.tableCell, { flex: 1.2 }]}>{formatFecha(atencion.fecha)}</Text>
                  <Text style={[pdfStyles.tableCell, { flex: 2.5 }]}>{atencion.servicio}</Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 1 }]}>{ars(atencion.precioCobrado)}</Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 1 }]}>{ars(atencion.comisionBarbero)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Liquidacion</Text>

          <View style={pdfStyles.subtotalRow}>
            <Text style={pdfStyles.subtotalLabel}>
              Total comision calculada ({atenciones.length} atenciones)
            </Text>
            <Text style={pdfStyles.subtotalValue}>{ars(totalComisionCalculada)}</Text>
          </View>

          {sueldoMinimo > 0 ? (
            <View style={pdfStyles.subtotalRow}>
              <Text style={pdfStyles.subtotalLabel}>Sueldo minimo garantizado</Text>
              <Text style={pdfStyles.subtotalValue}>{ars(sueldoMinimo)}</Text>
            </View>
          ) : null}

          {alquilerBancoCobrado > 0 ? (
            <View style={pdfStyles.subtotalRow}>
              <Text style={[pdfStyles.subtotalLabel, { color: colors.negative }]}>
                (-) Alquiler banco
              </Text>
              <Text style={[pdfStyles.subtotalValue, { color: colors.negative }]}>
                -{ars(alquilerBancoCobrado)}
              </Text>
            </View>
          ) : null}

          <View style={pdfStyles.dividerRow} />

          <View style={pdfStyles.subtotalRow}>
            <Text style={pdfStyles.subtotalLabelBold}>Resultado del periodo</Text>
            <Text
              style={[
                pdfStyles.subtotalValueBold,
                { color: resultadoPeriodo < 0 ? colors.negative : colors.accent },
              ]}
            >
              {ars(resultadoPeriodo)}
            </Text>
          </View>
        </View>

        <View
          style={[
            pdfStyles.resultBox,
            periodoPositivo ? pdfStyles.resultBoxPositive : pdfStyles.resultBoxNegative,
          ]}
        >
          <Text
            style={[
              pdfStyles.resultText,
              periodoPositivo ? pdfStyles.resultTextPositive : pdfStyles.resultTextNegative,
            ]}
          >
            {periodoPositivo
              ? `Monto a pagar: ${ars(montoAPagar)}`
              : "Periodo negativo. No se genera pago ni deuda futura."}
          </Text>
        </View>

        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            A51 Barber - Documento generado el {formatFechaLarga(fechaEmision)} - Solo de caracter informativo
          </Text>
        </View>
      </Page>
    </Document>
  );
}
