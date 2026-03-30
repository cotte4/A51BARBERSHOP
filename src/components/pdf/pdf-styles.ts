import { StyleSheet } from "@react-pdf/renderer";

// Paleta A51 Barber
// Fondo: blanco (#ffffff)
// Texto principal: #1a1a1a
// Acento / encabezados: #111827 (gray-900)
// Bordes: #e5e7eb (gray-200)
// Texto secundario: #6b7280 (gray-500)
// Verde positivo: #16a34a
// Rojo negativo: #dc2626

export const colors = {
  bg: "#ffffff",
  text: "#1a1a1a",
  accent: "#111827",
  border: "#e5e7eb",
  muted: "#6b7280",
  positive: "#16a34a",
  negative: "#dc2626",
  lightGray: "#f9fafb",
  blue: "#2563eb",
};

export const pdfStyles = StyleSheet.create({
  page: {
    backgroundColor: colors.bg,
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 40,
    paddingRight: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
  },

  // Cabecera
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: colors.text,
    marginBottom: 2,
  },
  headerMeta: {
    fontSize: 9,
    color: colors.muted,
  },

  // Secciones
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 4,
  },

  // Tabla
  table: {
    width: "100%",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.accent,
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: colors.lightGray,
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
    color: colors.text,
  },
  tableCellRight: {
    fontSize: 9,
    flex: 1,
    color: colors.text,
    textAlign: "right",
  },
  tableCellMuted: {
    fontSize: 9,
    flex: 1,
    color: colors.muted,
  },

  // Filas de subtotales
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  subtotalLabel: {
    fontSize: 9,
    color: colors.muted,
    flex: 3,
  },
  subtotalValue: {
    fontSize: 9,
    color: colors.text,
    textAlign: "right",
    flex: 1,
  },
  subtotalLabelBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
    flex: 3,
  },
  subtotalValueBold: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
    textAlign: "right",
    flex: 1,
  },
  dividerRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
    marginBottom: 4,
  },

  // Footer / resultado final
  resultBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 4,
  },
  resultBoxPositive: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#86efac",
  },
  resultBoxNegative: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  resultText: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  resultTextPositive: {
    color: colors.positive,
  },
  resultTextNegative: {
    color: colors.negative,
  },

  // Pie de página
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
    textAlign: "center",
  },

  // Helpers
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  labelText: {
    fontSize: 9,
    color: colors.muted,
  },
  valueText: {
    fontSize: 9,
    color: colors.text,
    fontFamily: "Helvetica-Bold",
  },
  emptyText: {
    fontSize: 9,
    color: colors.muted,
    textAlign: "center",
    paddingVertical: 12,
  },
  badge: {
    fontSize: 8,
    padding: 3,
    borderRadius: 3,
  },
  badgeBlue: {
    backgroundColor: "#eff6ff",
    color: colors.blue,
  },
});
