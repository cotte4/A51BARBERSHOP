import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles, colors } from "./pdf-styles";

// ——————————————————————————————
// Tipos
// ——————————————————————————————

export type PLPDFData = {
  mes: number; // 1–12
  anio: number;
  // Resultado casa
  ingresosGaboteBruto: number;
  comisionesGabote: number;
  feesMedioPagoGabote: number;
  alquilerBancoMes: number;
  margenProductosMes: number;
  ingresosCasaGabote: number;
  gastosFijosMes: number;
  resultadoCasa: number;
  // Resultado personal Pinky
  ingresosNetosPinky: number;
  cuotaMemasMes: number;
  resultadoPersonalPinky: number;
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

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function nombreMes(mes: number, anio: number): string {
  return `${MESES[(mes - 1) % 12]} ${anio}`;
}

function formatFechaEmision(fecha: string): string {
  const [year, month, day] = fecha.split("-").map(Number);
  return `${day} de ${MESES[(month ?? 1) - 1]} de ${year}`;
}

// ——————————————————————————————
// Sub-componente: fila de P&L
// ——————————————————————————————

type PLRowProps = {
  label: string;
  valor: number;
  negativo?: boolean;
  signo?: "+" | "-" | "=";
  indent?: boolean;
  bold?: boolean;
  muted?: boolean;
};

function PLRow({ label, valor, negativo, signo, indent, bold, muted }: PLRowProps) {
  const signoLabel = signo === "+" ? "+ " : signo === "-" ? "- " : signo === "=" ? "= " : "  ";
  const valorMostrado = negativo ? -valor : valor;
  const colorValor =
    valorMostrado < 0 ? colors.negative : bold ? colors.accent : colors.text;

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
        paddingHorizontal: indent ? 16 : 6,
        borderBottomWidth: bold ? 0 : 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text
        style={{
          fontSize: bold ? 10 : 9,
          fontFamily: bold ? "Helvetica-Bold" : "Helvetica",
          color: muted ? colors.muted : bold ? colors.accent : colors.text,
          flex: 3,
        }}
      >
        {signoLabel}{label}
      </Text>
      <Text
        style={{
          fontSize: bold ? 10 : 9,
          fontFamily: bold ? "Helvetica-Bold" : "Helvetica",
          color: colorValor,
          textAlign: "right",
          flex: 1,
        }}
      >
        {ars(Math.abs(valor))}
      </Text>
    </View>
  );
}

// ——————————————————————————————
// Componente principal
// ——————————————————————————————

export function PLPDF({ data }: { data: PLPDFData }) {
  const {
    mes,
    anio,
    ingresosGaboteBruto,
    comisionesGabote,
    feesMedioPagoGabote,
    alquilerBancoMes,
    margenProductosMes,
    ingresosCasaGabote,
    gastosFijosMes,
    resultadoCasa,
    ingresosNetosPinky,
    cuotaMemasMes,
    resultadoPersonalPinky,
  } = data;

  const hoy = new Date().toISOString().split("T")[0]!;
  const ingresosCasaTotal = ingresosCasaGabote + alquilerBancoMes + margenProductosMes;

  return (
    <Document title={`P&L ${nombreMes(mes, anio)}`} author="A51 Barber">
      <Page size="A4" style={pdfStyles.page}>
        {/* Cabecera */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerTitle}>A51 Barber — P&L Mensual</Text>
          <Text style={pdfStyles.headerSubtitle}>{nombreMes(mes, anio)}</Text>
          <Text style={pdfStyles.headerMeta}>
            Generado el {formatFechaEmision(hoy)}
          </Text>
        </View>

        {/* Bloque: Resultado casa */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Resultado casa</Text>

          <PLRow
            label="Cortes Gabote (bruto)"
            valor={ingresosGaboteBruto}
            signo="+"
          />
          <PLRow
            label="Comision Gabote (75%)"
            valor={comisionesGabote}
            negativo
            signo="-"
            indent
            muted
          />
          <PLRow
            label="Fees medios de pago (Gabote)"
            valor={feesMedioPagoGabote}
            negativo
            signo="-"
            indent
            muted
          />
          <PLRow
            label="Alquiler banco"
            valor={alquilerBancoMes}
            signo="+"
          />
          <PLRow
            label="Margen productos"
            valor={margenProductosMes}
            signo="+"
          />

          {/* Subtotal ingresos casa */}
          <View
            style={{
              backgroundColor: colors.lightGray,
              borderRadius: 3,
              marginTop: 4,
              marginBottom: 4,
            }}
          >
            <PLRow
              label="Ingresos casa"
              valor={ingresosCasaTotal}
              signo="="
              bold
            />
          </View>

          <PLRow
            label="Gastos del mes"
            valor={gastosFijosMes}
            negativo
            signo="-"
            indent
            muted
          />

          {/* Total resultado casa */}
          <View
            style={[
              pdfStyles.resultBox,
              resultadoCasa >= 0 ? pdfStyles.resultBoxPositive : pdfStyles.resultBoxNegative,
              { marginTop: 8 },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text
                style={[
                  pdfStyles.resultText,
                  resultadoCasa >= 0
                    ? pdfStyles.resultTextPositive
                    : pdfStyles.resultTextNegative,
                  { fontSize: 11, textAlign: "left" },
                ]}
              >
                = Resultado casa
              </Text>
              <Text
                style={[
                  pdfStyles.resultText,
                  resultadoCasa >= 0
                    ? pdfStyles.resultTextPositive
                    : pdfStyles.resultTextNegative,
                  { fontSize: 11 },
                ]}
              >
                {ars(resultadoCasa)}
              </Text>
            </View>
          </View>
        </View>

        {/* Bloque: Resultado personal Pinky */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Resultado personal Pinky</Text>

          <PLRow
            label="Ingresos Pinky (neto)"
            valor={ingresosNetosPinky}
            signo="+"
          />
          <PLRow
            label="Resultado casa"
            valor={resultadoCasa}
            signo="+"
          />
          {cuotaMemasMes > 0 && (
            <PLRow
              label="Cuota Memas"
              valor={cuotaMemasMes}
              negativo
              signo="-"
              indent
              muted
            />
          )}

          {/* Total resultado personal */}
          <View
            style={[
              pdfStyles.resultBox,
              resultadoPersonalPinky >= 0
                ? pdfStyles.resultBoxPositive
                : pdfStyles.resultBoxNegative,
              { marginTop: 8 },
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text
                style={[
                  pdfStyles.resultText,
                  resultadoPersonalPinky >= 0
                    ? pdfStyles.resultTextPositive
                    : pdfStyles.resultTextNegative,
                  { fontSize: 11, textAlign: "left" },
                ]}
              >
                = Resultado personal Pinky
              </Text>
              <Text
                style={[
                  pdfStyles.resultText,
                  resultadoPersonalPinky >= 0
                    ? pdfStyles.resultTextPositive
                    : pdfStyles.resultTextNegative,
                  { fontSize: 11 },
                ]}
              >
                {ars(resultadoPersonalPinky)}
              </Text>
            </View>
          </View>
        </View>

        {/* Sin datos */}
        {ingresosGaboteBruto === 0 &&
          ingresosNetosPinky === 0 &&
          gastosFijosMes === 0 && (
            <Text style={pdfStyles.emptyText}>
              No hay datos registrados para este mes.
            </Text>
          )}

        {/* Pie */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            A51 Barber — P&L {nombreMes(mes, anio)} — Generado el {formatFechaEmision(hoy)} — Solo
            de caracter informativo
          </Text>
        </View>
      </Page>
    </Document>
  );
}
