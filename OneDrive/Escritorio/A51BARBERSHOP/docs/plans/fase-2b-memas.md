# Plan: Fase 2B — Módulo Memas (Amortización Alemana)
Date: 28/03/2026
Updated: 29/03/2026
Status: done

---

## 1. Qué construye este plan

Al terminar este plan, `/repago` mostrará el cronograma completo de amortización alemana en USD con cuotas decrecientes, barra de progreso visual, proyección de fecha de cancelación, monto editable al registrar cada pago, y el saldo actualizado con el tipo de cambio del día — convirtiendo el módulo de un registro simple a un tracker financiero real de la deuda con Memas.

---

## 2. Parámetros confirmados del acuerdo (no reabrir)

| Parámetro | Valor confirmado |
|-----------|-----------------|
| Deuda total | u$d 1.500 |
| Tasa anual | 10% anual en USD |
| Cantidad de cuotas | 12 |
| Fecha de inicio | 1 de Mayo 2026 |
| Upload de comprobante | No — descartado para esta fase |

---

## 3. Cambios de schema

### En `repago_memas` — agregar 3 columnas nuevas:

```typescript
deudaUsd: numeric("deuda_usd", { precision: 10, scale: 2 }),
tasaAnualUsd: numeric("tasa_anual_usd", { precision: 5, scale: 4 }),  // 0.1000 (10%)
cantidadCuotasPactadas: integer("cantidad_cuotas_pactadas"),
// fechaInicio ya existe en schema — solo actualizar el seed
```

### En `repago_memas_cuotas` — agregar 5 columnas nuevas:

```typescript
repagoId: uuid("repago_id").references(() => repagoMemas.id),  // FK faltante
capitalPagado: numeric("capital_pagado", { precision: 12, scale: 2 }),
interesPagado: numeric("interes_pagado", { precision: 12, scale: 2 }),
tcDia: numeric("tc_dia", { precision: 10, scale: 2 }),
notas: text("notas"),
```

**Nota de migración:** Si ya existen filas en `repago_memas_cuotas`, la FK `repagoId` se debe agregar como NULLABLE en un primer paso, luego hacer UPDATE manual para asignar el `repagoId` correcto, luego hacer NOT NULL si se desea. Si la tabla está vacía, agregar directamente como NOT NULL con referencia.

---

## 4. Lógica de amortización alemana

### Fórmula

```
capital_fijo_por_cuota = deuda_usd_total / cantidad_cuotas_pactadas
interes_cuota_N        = saldo_pendiente_N × (tasa_anual / 12)
cuota_total_N          = capital_fijo + interes_cuota_N
saldo_pendiente_N+1    = saldo_pendiente_N - capital_fijo
```

### Ejemplo numérico — Deuda: u$d 1.500, tasa: 10% anual, cuotas: 12

- Capital fijo por cuota = 1.500 / 12 = **u$d 125,00**
- Tasa mensual = 10% / 12 = **0,8333% mensual**

| # | Saldo inicial (USD) | Capital (USD) | Interés (USD) | Cuota total (USD) | Saldo final (USD) |
|---|--------------------|--------------:|--------------:|------------------:|------------------:|
| 1 | 1.500,00 | 125,00 | 12,50 | 137,50 | 1.375,00 |
| 2 | 1.375,00 | 125,00 | 11,46 | 136,46 | 1.250,00 |
| 3 | 1.250,00 | 125,00 | 10,42 | 135,42 | 1.125,00 |
| 4 | 1.125,00 | 125,00 | 9,38 | 134,38 | 1.000,00 |
| 5 | 1.000,00 | 125,00 | 8,33 | 133,33 | 875,00 |
| 6 | 875,00 | 125,00 | 7,29 | 132,29 | 750,00 |
| 7 | 750,00 | 125,00 | 6,25 | 131,25 | 625,00 |
| 8 | 625,00 | 125,00 | 5,21 | 130,21 | 500,00 |
| 9 | 500,00 | 125,00 | 4,17 | 129,17 | 375,00 |
| 10 | 375,00 | 125,00 | 3,13 | 128,13 | 250,00 |
| 11 | 250,00 | 125,00 | 2,08 | 127,08 | 125,00 |
| 12 | 125,00 | 125,00 | 1,04 | 126,04 | 0,00 |

**Total pagado: u$d 1.580,63 (capital u$d 1.500 + intereses u$d 80,63)**

### Pago parcial o distinto al esperado

```
-- Si montoPagadoUsd == cuota_total_N (pago exacto):
  capitalPagado = capital_fijo
  interesPagado = interes_N

-- Si montoPagadoUsd < cuota_total_N (pago parcial):
  interesPagado = interes_N  (el interes se paga completo primero)
  capitalPagado = montoPagadoUsd - interesPagado
  -- puede ser negativo si el pago no cubre ni el interes — BLOQUEAR con error

-- Si montoPagadoUsd > cuota_total_N (pago adelantado):
  interesPagado = interes_N
  capitalPagado = montoPagadoUsd - interesPagado
  -- el capital extra reduce el saldo pendiente antes de calcular la proxima cuota
  -- NO cancela cuotas futuras automaticamente, solo reduce el saldo
```

Regla: el interés siempre se paga completo primero. El capital puede variar.

### Función generarCronograma

```typescript
// src/lib/amortizacion.ts
function generarCronograma(
  deudaUsd: number,
  tasaAnual: number,  // 0.10
  cantidadCuotas: number
): Array<{
  numeroCuota: number;
  saldoInicial: number;
  capital: number;
  interes: number;
  cuotaTotal: number;
  saldoFinal: number;
}> {
  const tasaMensual = tasaAnual / 12;
  const capitalFijo = deudaUsd / cantidadCuotas;
  let saldo = deudaUsd;
  const cronograma = [];

  for (let i = 1; i <= cantidadCuotas; i++) {
    const interes = saldo * tasaMensual;
    const cuotaTotal = capitalFijo + interes;
    const saldoFinal = Math.max(0, saldo - capitalFijo);

    cronograma.push({
      numeroCuota: i,
      saldoInicial: saldo,
      capital: capitalFijo,
      interes,
      cuotaTotal,
      saldoFinal,
    });

    saldo = saldoFinal;
  }
  return cronograma;
}
```

---

## 5. Páginas y componentes

### `/repago` — `page.tsx` (REESCRIBIR)

**Bloque 1 — Header con estado USD**
- Deuda original: u$d 1.500
- Saldo pendiente en USD
- Saldo pendiente en ARS al TC del día (campo manual)
- Badge: ACTIVO / CANCELADO

**Bloque 2 — Barra de progreso**
```
[████████░░░░░░░░░░░░] 33% cancelado
u$d 500 pagados de u$d 1.500
```
- Porcentaje = sum(capitalPagado) / deudaUsd × 100

**Bloque 3 — Proyección de cancelación**
```
Próxima cuota: Cuota #3 — u$d 135,42 (≈ $ARS XXX al TC del día)
Cancelación proyectada: Abril 2027 (10 cuotas restantes)
```

**Bloque 4 — Tabla del cronograma completo**
- N filas (12 en este caso)
- Columnas: # | Capital | Interés | Total USD | Estado
- Cuotas pagadas: checkmark verde + monto real pagado
- Cuotas pendientes: valores proyectados del cronograma en gris

**Bloque 5 — Formulario "Registrar pago"**
- `montoPagadoUsd` — input number, default = cuota_total_N del cronograma
- `tcDia` — input number, placeholder "Ej: 1200" (ARS por USD), campo obligatorio
- `notas` — textarea, opcional

**Bloque 6 — Historial de pagos**
- Columnas: Fecha | Cuota # | Capital USD | Interés USD | Total USD | TC del día | Monto ARS

**Estado CANCELADO:**
- Cuando sum(capitalPagado) >= deudaUsd: ocultar el formulario, mostrar banner verde "Deuda cancelada el [fecha último pago]"

---

## 6. Server Actions

### `registrarCuota(prevState, formData)` — REESCRIBIR

```typescript
// Validaciones:
// - solo admin
// - montoPagadoUsd > 0
// - tcDia > 0
// - montoPagadoUsd >= interes_cuota_N (no puede pagar menos que el interes)
// - si deuda ya cancelada → error "La deuda ya está cancelada"

// Logica:
// 1. Obtener repago singleton
// 2. Calcular numero de cuota siguiente (count de cuotas pagadas + 1)
// 3. Recalcular cronograma con generarCronograma() para obtener interes_N y saldo_N
// 4. Descomponer:
//    interesPagado = saldo_pendiente_actual * (tasaAnual / 12)
//    capitalPagado = montoPagadoUsd - interesPagado
// 5. Calcular montoArs = montoPagadoUsd * tcDia
// 6. INSERT en repago_memas_cuotas
// 7. UPDATE repago_memas: saldo_pendiente = saldo_pendiente - capitalPagado
//    si saldo_pendiente <= 0: set pagado_completo = true, saldo_pendiente = 0
// 8. revalidatePath("/repago")
```

### `actualizarConfigMemas(prevState, formData)` — NUEVA

Solo editable si cuotas_pagadas === 0. Permite cambiar tasaAnualUsd, cantidadCuotasPactadas, fechaInicio.

---

## 7. Checklist de implementación

### Paso 1 — Schema y migración

- [ ] 1.1 Modificar `src/db/schema.ts`: agregar `deudaUsd`, `tasaAnualUsd`, `cantidadCuotasPactadas` a `repagoMemas`
- [ ] 1.2 Modificar `src/db/schema.ts`: agregar `repagoId` (FK nullable primero), `capitalPagado`, `interesPagado`, `tcDia`, `notas` a `repagoMemasCuotas`
- [ ] 1.3 Ejecutar `npm run db:push`
- [ ] 1.4 Si hay filas existentes en `repago_memas_cuotas`: UPDATE manual para asignar `repago_id`
- [ ] 1.5 Actualizar `src/db/seed.ts`: `deudaUsd: "1500.00"`, `tasaAnualUsd: "0.1000"`, `cantidadCuotasPactadas: 12`, `fechaInicio: "2026-05-01"`

### Paso 2 — Lógica de negocio

- [ ] 2.1 Crear `src/lib/amortizacion.ts` con `generarCronograma(deudaUsd, tasaAnual, cantidadCuotas)`
- [ ] 2.2 Agregar `calcularCuotaSiguiente(cronograma, cuotasPagadas)` → próxima cuota esperada
- [ ] 2.3 Agregar `calcularFechaCancelacion(fechaInicio, cuotasPagadas, cantidadCuotas)` → Date
- [ ] 2.4 Agregar `calcularPorcentajeAvance(capitalPagadoAcumulado, deudaUsd)` → 0-100
- [ ] 2.5 Verificar manualmente con la tabla del ejemplo (Sección 4) que los números son exactos

### Paso 3 — Server Actions

- [ ] 3.1 Reescribir `src/app/(admin)/repago/actions.ts`: nueva firma con monto editable, tcDia, descomposicion capital/interes
- [ ] 3.2 Agregar `actualizarConfigMemas(prevState, formData)` en el mismo archivo

### Paso 4 — Página `/repago`

- [ ] 4.1 Reescribir `src/app/(admin)/repago/page.tsx` con los 6 bloques de la Sección 5
- [ ] 4.2 Si deuda cancelada: ocultar formulario, mostrar banner CANCELADO con fecha
- [ ] 4.3 El formulario de pago pre-rellena el monto con `cuotaTotal` del cronograma (editable)

### Paso 5 — Verificación

- [ ] 5.1 `npm run build` sin errores TypeScript
- [ ] 5.2 Verificar tabla del cronograma contra el ejemplo de Sección 4
- [ ] 5.3 Registrar un pago de prueba, verificar que el saldo en USD se actualiza
- [ ] 5.4 Registrar el último pago (cuota 12), verificar que aparece estado CANCELADO

---

## 8. Criterios de aceptación

| # | Criterio |
|---|----------|
| CA-1 | Saldo pendiente se muestra en USD |
| CA-2 | Cronograma muestra 12 cuotas con capital fijo y cuota total decreciente |
| CA-3 | Cuotas ya pagadas aparecen marcadas con monto real |
| CA-4 | Barra de progreso refleja % correcto de capital cancelado |
| CA-5 | Proyección de fecha de cancelación es correcta (ej: 0 pagos → Abril 2027) |
| CA-6 | Pinky puede modificar el monto al registrar (pago parcial o anticipado) |
| CA-7 | `tc_dia` se registra en cada cuota y no puede ser NULL |
| CA-8 | Si la deuda está cancelada, el formulario desaparece y aparece banner CANCELADO |
| CA-9 | Un pago menor al interés de la cuota es rechazado con error claro |
| CA-10 | La configuración (tasa, cuotas) solo es editable si no hay pagos registrados |

---

## 9. Out of scope

- API automática de tipo de cambio (Fase 3)
- Alertas de cuota atrasada (Fase 3)
- Edición o anulación de cuotas registradas (Fase 3)
- Upload de comprobante (descartado por Pinky)
- Widget de Memas en el dashboard — coordinar con Fase 2A
- PDF del cronograma (Fase 2C)

---

*Actualizado: 29/03/2026 — parámetros del acuerdo confirmados por Pinky*
