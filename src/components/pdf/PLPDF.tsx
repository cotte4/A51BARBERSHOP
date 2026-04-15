import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { pdfStyles, colors } from "./pdf-styles";

export type PLPDFData = {
  mes: number;
  anio: number;
  ingresosGaboteBruto: number;
  ingresosPinkyBruto: number;
  ingresosProductosBruto: number;
  ingresoBrutoTotal: number;
  comisionGabote: number;
  comisionGabotePct: number;
  costoProductosVendidos: number;
  feesMedioPagoTotal: number;
  margenBruto: number;
  margenBrutoPct: number;
  gastosFijosMes: number;
  gastosPorCategoria: { categoria: string; monto: number }[];
  resultadoOperativo: number;
  cuotaMemasMes: number;
  cuotasPagadas: number;
  cantidadCuotasPactadas: number | null;
  saldoPendiente: number;
  deudaUsd: number;
  resultadoNeto: number;
};

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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

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

function ResultBox({ label, valor }: { label: string; valor: number }) {
  const positive = valor >= 0;
  return (
    <View
      style={[
        pdfStyles.resultBox,
        positive ? pdfStyles.resultBoxPositive : pdfStyles.resultBoxNegative,
        { marginTop: 8 },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text
          style={[
            pdfStyles.resultText,
            positive ? pdfStyles.resultTextPositive : pdfStyles.resultTextNegative,
            { fontSize: 11, textAlign: "left" },
          ]}
        >
          = {label}
        </Text>
        <Text
          style={[
            pdfStyles.resultText,
            positive ? pdfStyles.resultTextPositive : pdfStyles.resultTextNegative,
            { fontSize: 11 },
          ]}
        >
          {ars(valor)}
        </Text>
      </View>
    </View>
  );
}

export function PLPDF({ data }: { data: PLPDFData }) {
  const hoy = new Date().toISOString().split("T")[0]!;
  const cuotaLabel = data.cantidadCuotasPactadas
    ? `cuota ${data.cuotasPagadas + 1} de ${data.cantidadCuotasPactadas}`
    : `${data.cuotasPagadas} pagadas`;

  return (
    <Document title={`P&L ${nombreMes(data.mes, data.anio)}`} author="A51 Barber">
      <Page size="A4" style={pdfStyles.page}>
        {/* Cabecera */}
        <View style={pdfStyles.header}>
          <Text style={pdfStyles.headerTitle}>A51 Barber — P&L Mensual</Text>
          <Text style={pdfStyles.headerSubtitle}>{nombreMes(data.mes, data.anio)}</Text>
          <Text style={pdfStyles.headerMeta}>Generado el {formatFechaEmision(hoy)}</Text>
        </View>

        {/* 1. INGRESOS */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Ingresos</Text>
          <PLRow label="Servicios Gabote" valor={data.ingresosGaboteBruto} signo="+" />
          <PLRow label="Servicios Pinky" valor={data.ingresosPinkyBruto} signo="+" />
          {data.ingresosProductosBruto > 0 && (
            <PLRow label="Venta de productos" valor={data.ingresosProductosBruto} signo="+" />
          )}
          <ResultBox label="Ingreso bruto total" valor={data.ingresoBrutoTotal} />
        </View>

        {/* 2. COSTOS VARIABLES */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Costos variables</Text>
          <PLRow
            label={`Comision Gabote (${data.comisionGabotePct}%)`}
            valor={data.comisionGabote}
            negativo
            signo="-"
            indent
            muted
          />
          {data.costoProductosVendidos > 0 && (
            <PLRow
              label="Costo productos vendidos"
              valor={data.costoProductosVendidos}
              negativo
              signo="-"
              indent
              muted
            />
          )}
          <PLRow
            label="Fees medios de pago"
            valor={data.feesMedioPagoTotal}
            negativo
            signo="-"
            indent
            muted
          />
          <ResultBox label={`Margen bruto (${data.margenBrutoPct}%)`} valor={data.margenBruto} />
        </View>

        {/* 3. COSTOS FIJOS */}
        <View style={pdfStyles.section}>
          <Text style={pdfStyles.sectionTitle}>Costos operativos</Text>
          {data.gastosPorCategoria.map(({ categoria, monto }) => (
            <PLRow
              key={categoria}
              label={capitalize(categoria)}
              valor={monto}
              negativo
              signo="-"
              indent
              muted
            />
          ))}
          {data.gastosPorCategoria.length === 0 && (
            <PLRow label="Sin gastos registrados" valor={0} muted />
          )}
          <ResultBox label="Resultado operativo" valor={data.resultadoOperativo} />
        </View>

        {/* 4. FINANCIERO */}
        {data.cuotaMemasMes > 0 && (
          <View style={pdfStyles.section}>
            <Text style={pdfStyles.sectionTitle}>Financiero</Text>
            <PLRow
              label={`Repago inversion inicial (${cuotaLabel}${data.deudaUsd > 0 ? ` — u$d ${data.deudaUsd.toLocaleString("es-AR")} pendiente` : ""})`}
              valor={data.cuotaMemasMes}
              negativo
              signo="-"
              indent
              muted
            />
          </View>
        )}

        {/* RESULTADO NETO */}
        <View style={[pdfStyles.resultBox, pdfStyles.resultBoxPositive, { marginTop: 12 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[pdfStyles.resultText, pdfStyles.resultTextPositive, { fontSize: 12, textAlign: "left" }]}>
              Resultado neto del negocio
            </Text>
            <Text style={[
              pdfStyles.resultText,
              data.resultadoNeto >= 0 ? pdfStyles.resultTextPositive : pdfStyles.resultTextNegative,
              { fontSize: 12 },
            ]}>
              {ars(data.resultadoNeto)}
            </Text>
          </View>
          <Text style={{ fontSize: 8, color: colors.muted, marginTop: 4 }}>
            Va integramente a Pinky como dueno del negocio
          </Text>
        </View>

        {/* Pie */}
        <View style={pdfStyles.footer} fixed>
          <Text style={pdfStyles.footerText}>
            A51 Barber — P&L {nombreMes(data.mes, data.anio)} — Generado el{" "}
            {formatFechaEmision(hoy)} — Solo de caracter informativo
          </Text>
        </View>
      </Page>
    </Document>
  );
}
