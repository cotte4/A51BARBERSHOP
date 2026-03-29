# Plan: Fase 2C - PDF Exportable
Date: 28/03/2026
Updated: 29/03/2026
Status: done

## Dependencia crítica

**Este plan depende de Fase 2A (Dashboard).** El PDF del P&L usa las mismas queries y fórmulas del dashboard. Implementar Fase 2A primero.

Los PDFs de liquidación y cierre pueden implementarse independientemente de 2A.

---

## Que construye este plan

Al terminar este plan, Pinky puede descargar PDFs de liquidaciones, cierres de caja y P&L mensual directamente desde cada pantalla. Gabote puede descargar únicamente su propia liquidación.

---

## Setup previo (hacer una sola vez antes de tocar código)

- [ ] S.1 Instalar dependencia: `npm install @react-pdf/renderer@^4.3.2`
- [ ] S.2 Agregar a `next.config.ts`:
  ```typescript
  serverExternalPackages: ["@react-pdf/renderer"]
  ```
  (ver `docs/research/pdf-y-blob.md` para la config exacta)
- [ ] S.3 Verificar que `npm run build` pasa con el cambio de config

---

## Reglas de autorización

| PDF | Quién puede descargarlo |
|-----|------------------------|
| Liquidación (cualquier barbero) | Solo admin (Pinky) |
| Liquidación propia | El barbero de esa liquidación (Gabote puede descargar la suya) |
| Cierre de caja | Solo admin |
| P&L mensual | Solo admin |

Implementar: el route handler debe verificar sesión y comparar `barberoId` antes de servir el PDF.

---

## Estructura de archivos

```
src/app/api/pdf/
  liquidacion/[id]/route.ts       — GET: PDF de una liquidación (admin o barbero propio)
  cierre/[fecha]/route.ts         — GET: PDF del cierre de un día (solo admin)
  pl/route.ts                     — GET?mes=X&anio=Y: PDF del P&L mensual (solo admin)

src/components/pdf/
  LiquidacionPDF.tsx              — componente react-pdf para liquidaciones
  CierrePDF.tsx                   — componente react-pdf para cierres
  PLPDF.tsx                       — componente react-pdf para P&L mensual
  pdf-styles.ts                   — estilos compartidos (colores, fonts, layout)
```

**Regla crítica:** Todos los route handlers deben declarar `export const runtime = "nodejs"`. Sin esto, Vercel los despliega como Edge Functions y react-pdf falla.

**Fonts:** No registrar fonts custom con rutas relativas del filesystem. Si se necesita fuente custom, usar URL absoluta (`https://...`). Por ahora usar la font por defecto de react-pdf para evitar este problema en prod.

---

## Contenido de cada PDF

### PDF de liquidación

- Cabecera: nombre del barbero, período (mes/año), fecha de emisión
- Tabla de atenciones: fecha | servicio | precio cobrado | comisión barbero
- Subtotales:
  - Total comisión calculada
  - Sueldo mínimo garantizado (si aplica)
  - Base liquidable = max(comision, sueldo_minimo)
  - (-) Alquiler banco mensual
  - = Resultado del período
- Pie:
  - Si resultado > 0: "**Monto a pagar: $X**"
  - Si resultado <= 0: "**Mes negativo. No se genera pago ni deuda.**"
- Nunca mostrar saldo arrastrado ni deuda futura

### PDF de cierre

- Cabecera: fecha del cierre
- Resumen por medio de pago: medio | atenciones | total bruto | fee | neto
- Total bruto del día
- (-) Fees de medios de pago
- = Caja neta del día
- Desglose por barbero: barbero | atenciones | comisión
- Aporte económico casa del día (separado de caja neta)

### PDF de P&L mensual

Mismo contenido que `/dashboard/pl` pero formateado para impresión:
- Período, fecha de generación
- Tabla de P&L completa con todas las líneas
- Resultado casa
- Resultado personal Pinky
- Nota al pie: "Generado el [fecha] — valores basados en cierres registrados"

---

## Checklist de implementación

### Paso 1 — Setup (ver sección Setup previo arriba)

### Paso 2 — Estilos y componentes base

- [ ] 2.1 Crear `src/components/pdf/pdf-styles.ts` con StyleSheet compartido (colores A51, tamaños de texto, márgenes)
- [ ] 2.2 Crear `src/components/pdf/LiquidacionPDF.tsx` con el layout de Sección "Contenido"
- [ ] 2.3 Crear `src/components/pdf/CierrePDF.tsx`
- [ ] 2.4 Crear `src/components/pdf/PLPDF.tsx` (depende de que Fase 2A esté lista)

### Paso 3 — Route handlers

- [ ] 3.1 Crear `src/app/api/pdf/liquidacion/[id]/route.ts`:
  - Verificar sesión
  - Si rol barbero: verificar que `liquidacion.barberoId === session.user.barberoId`
  - Si no autorizado: 403
  - Obtener datos de la liquidación desde DB
  - `renderToBuffer(<LiquidacionPDF data={...} />)`
  - Devolver response con headers `Content-Type: application/pdf`
- [ ] 3.2 Crear `src/app/api/pdf/cierre/[fecha]/route.ts`:
  - Verificar admin — si no: 403
  - Obtener datos del cierre
  - `renderToBuffer(<CierrePDF data={...} />)`
- [ ] 3.3 Crear `src/app/api/pdf/pl/route.ts`:
  - Verificar admin — si no: 403
  - Reutilizar la misma query de `getPL(mes, anio)` de Fase 2A
  - `renderToBuffer(<PLPDF data={...} />)`

### Paso 4 — Botones de descarga en las pantallas existentes

- [ ] 4.1 Agregar botón "Descargar PDF" en `/liquidaciones/[id]`
  - Para admin: siempre visible
  - Para Gabote: solo si la liquidación es la suya
- [ ] 4.2 Agregar botón "Descargar PDF" en `/caja/cierre/[fecha]`
- [ ] 4.3 Agregar botón "Descargar PDF" en `/dashboard/pl` (Fase 2A)

Los botones deben ser un `<a href="/api/pdf/...">` con `download` attribute, no un fetch manual.

### Paso 5 — Verificación

- [ ] 5.1 `npm run build` sin errores TypeScript
- [ ] 5.2 Descargar PDF de una liquidación positiva — verificar que muestra "Monto a pagar"
- [ ] 5.3 Descargar PDF de una liquidación negativa — verificar que muestra "Mes negativo"
- [ ] 5.4 Verificar que Gabote puede descargar su liquidación pero recibe 403 al intentar una ajena
- [ ] 5.5 Verificar que Gabote recibe 403 al intentar descargar un cierre o P&L

---

## Acceptance criteria

- PDFs descargan correctamente sin errores de runtime
- Liquidación positiva muestra monto a pagar
- Liquidación negativa muestra "Mes negativo. No se genera pago ni deuda."
- Cierre muestra caja neta y aporte económico como valores separados
- Gabote puede descargar su propia liquidación
- Gabote recibe 403 al intentar descargar liquidaciones ajenas, cierres o P&L
- El P&L PDF tiene los mismos números que la vista `/dashboard/pl`
- Build pasa en Vercel (Node.js runtime declarado en todos los route handlers)

---

## Edge cases

- Liquidación con 0 atenciones: el PDF se genera pero la tabla de atenciones muestra "Sin atenciones registradas"
- Cierre de día sin ventas de productos: omitir la sección de productos
- P&L de un mes sin datos: mostrar todas las líneas en 0 con nota "Sin cierres registrados para este período"
- Fecha de cierre inválida: devolver 404

---

## Out of scope

- Almacenamiento de PDFs en Vercel Blob (generación on-demand solamente)
- PDF del cronograma de Memas
- Envío de PDFs por email o WhatsApp
