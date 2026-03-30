import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles, colors } from "./pdf-styles";

// ——————————————————————————————
// Tipos
// ——————————————————————————————

export type AtencionLiquidacionData = {
  fecha: string; // "YYYY-MM-DD"
  servicio: string; // nombre del servicio o notas
  precioCobrado: number;
  comisionBarbero: number;
};

export type LiquidacionPDFData = {
  barberoNombre: string;
  periodoInicio: string; // "YYYY-MM-DD"
  periodoFin: string; // "YYYY-MM-DD"
  fechaEmision: string; // "YYYY-MM-DD"
  atenciones: AtencionLiquidacionData[];
  totalComisionCalculada: number;
  sueldoMinimo: number;
  baseLiquidable: number;
  alquilerBancoCobrado: number;
  resultadoPeriodo: number;
  montoAPagar: number;
};

// ——————————————————————————————
// Helpers de formato
// ——————————————————————————————

function ars(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatFecha(iso: string): string {
  // Usa UTC+0 fijo para consistencia en server-side
  const [year, month, day] = iso.split("-").map(Number);
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
  ];
  return `${day} ${meses[(month ?? 1) - 1]} ${year}`;
}

function formatFechaLarga(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${day} de ${meses[(month ?? 1) - 1]} de ${year}`;
}

// ——————————————————————————————
// Componente
// ——————————————————————————————

export function LiquidacionPDF({ data }: { data: LiquidacionPDFData }) {
  const {
    barberoNombre,
    periodoInicio,
    periodoFin,
    fechaEmision,
    atenciones,
    totalComisionCalculada,
    sueldoMinimo,
    baseLiquidable,
    alquilerBancoCobrado,
    resultadoPeriodo,
    montoAPagar,
  } = data;

  const seAplicoMinimo = sueldoMinimo > 0 && totalComisionCalculada < sueldoMinimo;
  const mesPositivo = montoAPagar > 0;

  return (
    <Document
      title={`Liquidacion ${barberoNombre} - ${periodoInicio}`}
      author="A51 Barber"
    >
      <Page size="A4" style={pdfStyles.page}>
        {/* Cabecera */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerTitle}>A51 Barber — Liquidacion Mensual</Text>
          <Text style={pdfStyles.headerSubtitle}>{barberoNombre}</Text>
          <Text style={pdfStyles.headerMeta}>
            Periodo: {formatFechaLarga(periodoInicio)} al {formatFechaLarga(periodoFin)}
          </Text>
          <Text style={pdfStyles.headerMeta}>
            Fecha de emision: {formatFechaLarga(fechaEmision)}
          </Text>
        </View>

        {/* Tabla de atenciones */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Atenciones del periodo</Text>

          {atenciones.length === 0 ? (
            <Text style={pdfStyles.emptyText}>Sin atenciones registradas</Text>
          ) : (
            <View style={pdfStyles.table}>
              {/* Header */}
              <View style={pdfStyles.tableHeader}>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1.2 }]}>Fecha</Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 2.5 }]}>Servicio</Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
                  Precio
                </Text>
                <Text style={[pdfStyles.tableHeaderCell, { flex: 1, textAlign: "right" }]}>
                  Comision
                </Text>
              </View>

              {/* Filas */}
              {atenciones.map((atencion, idx) => (
                <View
                  key={idx}
                  style={idx % 2 === 0 ? pdfStyles.tableRow : pdfStyles.tableRowAlt}
                >
                  <Text style={[pdfStyles.tableCell, { flex: 1.2 }]}>
                    {formatFecha(atencion.fecha)}
                  </Text>
                  <Text style={[pdfStyles.tableCell, { flex: 2.5 }]}>
                    {atencion.servicio}
                  </Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 1 }]}>
                    {ars(atencion.precioCobrado)}
                  </Text>
                  <Text style={[pdfStyles.tableCellRight, { flex: 1 }]}>
                    {ars(atencion.comisionBarbero)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Subtotales */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Liquidacion</Text>

          <View style={pdfStyles.subtotalRow}>
            <Text style={pdfStyles.subtotalLabel}>
              Total comision calculada ({atenciones.length} atenciones)
            </Text>
            <Text style={pdfStyles.subtotalValue}>{ars(totalComisionCalculada)}</Text>
          </View>

          {sueldoMinimo > 0 && (
            <View style={pdfStyles.subtotalRow}>
              <Text style={pdfStyles.subtotalLabel}>
                Sueldo minimo garantizado{seAplicoMinimo ? " (se aplico)" : ""}
              </Text>
              <Text style={pdfStyles.subtotalValue}>{ars(sueldoMinimo)}</Text>
            </View>
          )}

          <View style={pdfStyles.subtotalRow}>
            <Text style={pdfStyles.subtotalLabel}>
              Base liquidable {sueldoMinimo > 0 ? "(max entre comision y sueldo minimo)" : ""}
            </Text>
            <Text style={pdfStyles.subtotalValue}>{ars(baseLiquidable)}</Text>
          </View>

          {alquilerBancoCobrado > 0 && (
            <View style={pdfStyles.subtotalRow}>
              <Text style={[pdfStyles.subtotalLabel, { color: colors.negative }]}>
                (-) Alquiler banco mensual
              </Text>
              <Text style={[pdfStyles.subtotalValue, { color: colors.negative }]}>
                -{ars(alquilerBancoCobrado)}
              </Text>
            </View>
          )}

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

        {/* Resultado final */}
        <View
          style={[
            pdfStyles.resultBox,
            mesPositivo ? pdfStyles.resultBoxPositive : pdfStyles.resultBoxNegative,
          ]}
        >
          <Text
            style={[
              pdfStyles.resultText,
              mesPositivo ? pdfStyles.resultTextPositive : pdfStyles.resultTextNegative,
            ]}
          >
            {mesPositivo
              ? `Monto a pagar: ${ars(montoAPagar)}`
              : "Mes negativo. No se genera pago ni deuda futura."}
          </Text>
        </View>

        {/* Pie */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            A51 Barber — Documento generado el {formatFechaLarga(fechaEmision)} — Solo de caracter
            informativo
          </Text>
        </View>
      </Page>
    </Document>
  );
}
