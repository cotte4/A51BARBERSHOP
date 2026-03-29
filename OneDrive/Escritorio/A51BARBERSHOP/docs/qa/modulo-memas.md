# Q&A: Módulo Memas — Especificación para Planning
Date: 28/03/2026
Status: borrador — para revisión de Pinky antes de Fase 2

---

## Estado actual (importante para el agente de Planning)

El módulo Memas ya tiene una implementación básica funcional en la Fase 1E del MVP. Existe código en producción en:

- `a51-barber/src/app/(admin)/repago/page.tsx` — vista del estado de la deuda + historial
- `a51-barber/src/app/(admin)/repago/actions.ts` — Server Action `registrarCuota()`
- `a51-barber/src/db/schema.ts` — tablas `repago_memas` y `repago_memas_cuotas`
- `a51-barber/src/db/seed.ts` — datos iniciales sembrados: deuda $2.384.571, cuota $400.000

El PRD v4.1 (sección "Próximos pasos / Fase 2") lista el módulo Memas como pendiente de expansión. La tarea de Fase 2 es completar y enriquecer lo ya construido, no crearlo desde cero.

---

## 1. Contexto del negocio — Qué es la deuda con Memas

### Quién es Memas

El PRD (Sección 3) identifica a los socios de A51 Barber como:

> "Pinky (dueño/barbero) + Memas Agency (capital)"

Memas Agency es el socio capitalista que aportó parte de la inversión inicial para abrir la barbería. No es un banco ni un proveedor: es un co-inversor.

### Monto de la deuda

La inversión inicial total fue de **$6.928.071 ARS**, dividida:

- Pinky: 65,6% = ~$4.544.671 ARS
- Memas: 34,4% = **$2.384.571 ARS**

La deuda a repagar es exactamente la parte que Memas aportó: **$2.384.571 ARS**. El seed data lo confirma con `valorLlaveTotal: "2384571.00"`.

El PRD llama a este monto "valor llave" — hace referencia a la inversión en el local/llave del negocio.

### Origen del nombre en la fórmula financiera

En la lógica financiera de Pinky (PRD Sección 3):

```
pinky_neto = pinky_bruto - repago_memas ($400.000/mes)
```

Esto significa que el repago a Memas **sale de los ingresos de Pinky**, no de los gastos de la casa. Es una obligación personal de Pinky con su socio capitalista.

### Cronograma esperado

El PRD indica:
> "Este módulo es importante porque el modelo financiero muestra que Memas se cancela en ~mes 6 (Sep 2026) con el escenario estándar."

Con deuda de $2.384.571 y cuota de $400.000/mes:
- 5 cuotas × $400.000 = $2.000.000
- 6ta cuota = $384.571 (cuota final parcial)
- Cancelación proyectada: ~Sep/Oct 2026

---

## 2. Modelo de datos — Estado actual y brechas

### Tablas ya implementadas en schema.ts

```typescript
// Tabla singleton — un solo registro por sistema
repago_memas (
  id UUID PRIMARY KEY,
  valor_llave_total NUMERIC(12,2),  -- $2.384.571 ARS
  cuota_mensual NUMERIC(12,2),      -- $400.000 ARS
  cuotas_pagadas INT DEFAULT 0,
  saldo_pendiente NUMERIC(12,2),
  fecha_inicio DATE,
  pagado_completo BOOLEAN DEFAULT false
)

// Tabla de historial — un registro por cuota pagada
repago_memas_cuotas (
  id UUID PRIMARY KEY,
  numero_cuota INT,
  fecha_pago DATE,
  monto_pagado NUMERIC(12,2),
  comprobante_url TEXT
)
```

### Brechas identificadas en el schema actual

1. **`repago_memas_cuotas` no tiene FK a `repago_memas`** — no hay `repago_id UUID REFERENCES repago_memas`. Actualmente es una tabla huérfana. Riesgo: si alguna vez hubiera múltiples registros de deuda, no hay forma de asociarlas.

2. **`repago_memas` no tiene `fecha_inicio`** — el campo existe en el schema pero el seed no lo setea. Sin fecha de inicio no se puede calcular si el pago es "en fecha" vs. "atrasado".

3. **No hay campo `notas` en cuotas** — el PRD de Módulo 8 no lo menciona explícitamente, pero es una brecha práctica.

4. **No hay campo `fecha_vencimiento` o `numero_cuota_esperada`** — el sistema sabe cuántas cuotas se pagaron pero no puede saber si una cuota está atrasada respecto al cronograma.

### Campos a agregar en Fase 2 (DECISIÓN PENDIENTE: confirmar con Pinky)

```sql
-- Agregar a repago_memas:
ALTER TABLE repago_memas ADD COLUMN fecha_inicio DATE;
ALTER TABLE repago_memas ADD COLUMN notas TEXT;

-- Agregar a repago_memas_cuotas:
ALTER TABLE repago_memas_cuotas ADD COLUMN repago_id UUID REFERENCES repago_memas(id);
ALTER TABLE repago_memas_cuotas ADD COLUMN notas TEXT;
```

---

## 3. Flujo de uso — Cómo Pinky gestiona el repago

### Flujo actual (ya funciona en MVP)

1. Pinky entra a `/repago` (ruta admin)
2. Ve el estado: deuda original, saldo pendiente, cuotas pagadas, cuotas restantes, monto próxima cuota
3. Hace click en "Registrar pago de cuota"
4. El sistema registra la cuota con el monto fijo ($400.000), reduce el saldo, incrementa `cuotas_pagadas`
5. Historial de pagos se muestra debajo con cada cuota y su fecha

### Limitaciones del flujo actual

- **El monto es siempre el fijo ($400.000)**: La action `registrarCuota()` calcula `montoPago = Math.min(cuota, saldoActual)`. No hay forma de ingresar un monto diferente.
- **No se puede subir comprobante**: El campo `comprobante_url` existe en la DB pero no hay UI para adjuntarlo.
- **No hay proyección visual de fecha de cancelación**: El PRD lo requiere explícitamente. Actualmente solo se muestra `cuotasRestantes` como número.
- **No hay barra de progreso visual**: El PRD dice "Progreso visual (ej: barra de progreso)".

### Flujo extendido para Fase 2 (lo que falta)

1. Al registrar una cuota, Pinky puede **modificar el monto** (para pagos parciales o anticipados — PRD edge case)
2. Pinky puede **adjuntar comprobante de transferencia** (foto o PDF)
3. La página muestra **fecha proyectada de cancelación** ("Al ritmo actual, se cancela en Oct 2026")
4. La página muestra **barra de progreso** visual ("$800.000 de $2.384.571 pagados")

---

## 4. Cálculos

### Monto de cuota

- **Cuota fija**: $400.000 ARS por mes. No hay interés mencionado en el PRD.
- **Cuota final parcial**: el sistema ya lo maneja con `montoPago = Math.min(cuota, saldoActual)` — la última cuota puede ser menor.

### DECISIONES PENDIENTES sobre cálculos

**DP-1: ¿Hay interés?**
El PRD no menciona interés en ninguna parte. La lógica del modelo financiero usa $400.000/mes × 6 = $2.400.000 ≈ $2.384.571 (diferencia de $15.429 cubierta por cuota final parcial). Esto sugiere **sin interés**. Pero en Argentina con inflación del 30% anual, un acuerdo sin interés entre socios es inusual.
> Recomendación: confirmar con Pinky si el acuerdo es sin interés. Si hay interés, el modelo de datos cambia significativamente.

**DP-2: ¿En ARS o USD?**
El PRD dice que todos los montos se guardan en ARS. El modelo financiero proyecta el net income en USD pero no menciona que la deuda con Memas esté denominada en dólares. La cuota de $400.000 ARS se desvaloriza con inflación, lo que beneficia a Pinky.
> Recomendación: confirmar con Pinky si hay indexación por inflación o dólar. Si no hay, documentarlo explícitamente para evitar disputas futuras.

**DP-3: ¿Frecuencia de pago?**
El PRD dice "cuota mensual" y la fórmula es `pinky_neto = pinky_bruto - repago_memas ($400.000/mes)`. La frecuencia parece mensual, pero el sistema no verifica ni alerta si una cuota no fue pagada en el mes correspondiente.
> Recomendación: agregar campo `mes_correspondiente` (YYYY-MM) a `repago_memas_cuotas` para poder trackear atrasos.

### Proyección de cancelación (cálculo)

```
cuotas_restantes = CEIL(saldo_pendiente / cuota_mensual)
fecha_cancelacion = fecha_hoy + cuotas_restantes meses
```

Si el saldo es $1.984.571 y la cuota es $400.000:
- Cuotas restantes = CEIL(1.984.571 / 400.000) = 5
- Fecha cancelación = Mayo 2026 + 5 meses = Octubre 2026

---

## 5. Integración con liquidaciones

### Relación con el módulo de liquidaciones

El repago a Memas **no está integrado directamente con las liquidaciones** en el código actual. Son módulos independientes. Esto es correcto porque:

- Las liquidaciones calculan lo que la **casa le paga a Gabote**
- El repago a Memas es una obligación de **Pinky como persona**, no de la casa

### Cómo aparece en el P&L de Pinky

En la fórmula del PRD:
```
pinky_neto = pinky_bruto - repago_memas ($400.000/mes)
```

Esto significa que en el **dashboard financiero de Fase 2**, el P&L de Pinky debe restar el repago del mes como un gasto. La integración es a nivel de **reporte**, no de transacción automática.

### DECISIÓN PENDIENTE sobre integración

**DP-4: ¿El sistema descuenta automáticamente la cuota del cierre de mes?**
Actualmente Pinky hace click manual en "Registrar pago de cuota". El PRD habla de "Registro automático de cuota mensual" (Módulo 8, Features) lo que podría interpretarse como registro automático al cerrar el mes, o simplemente que el sistema facilita el registro (no que lo hace solo).
> Recomendación: mantener registro manual. Un pago real a Memas implica una transferencia bancaria real — no se debe marcar como pagado automáticamente. "Registro automático" probablemente significa que el sistema pre-llena los campos, no que hace la transferencia.

**DP-5: ¿Se muestra el impacto de Memas en el dashboard financiero?**
El KPI del PRD (Sección 17) pregunta: "¿Cuánto lleva acumulado el repago a Memas? → vs. cronograma". Esto requiere que el dashboard consuma datos de `repago_memas`. No hay integración todavía.
> Acción: el agente de Planning de Fase 2 (dashboard financiero) debe incluir este widget.

---

## 6. Acceptance criteria del PRD (Módulo 8, Fase 2)

Tomados literalmente del PRD:

- [ ] El saldo pendiente se actualiza automáticamente al registrar cada cuota pagada
- [ ] La proyección de cancelación muestra la fecha exacta basada en el ritmo actual de pagos
- [ ] Se puede adjuntar comprobante de transferencia a cada cuota
- [ ] El módulo muestra el progreso visualmente (ej: "6 de 6 cuotas pagas — CANCELADO!")
- [ ] Si se paga una cuota de monto distinto al fijo, el sistema lo acepta y recalcula el saldo

**Edge cases del PRD:**
- Pago de cuota parcial → registrar el monto real, ajustar saldo pendiente
- Pago anticipado de múltiples cuotas → el sistema acepta pagos de cualquier monto y reduce el saldo total
- Deuda cancelada completamente → el módulo muestra estado "CANCELADO" y fecha de cancelación

**Estado de cada criterio en la implementación actual:**
| Criterio | Estado actual |
|----------|---------------|
| Saldo se actualiza al registrar cuota | IMPLEMENTADO |
| Proyección de fecha de cancelación | FALTA — solo muestra número de cuotas restantes |
| Adjuntar comprobante | FALTA — campo en DB, sin UI |
| Barra de progreso visual | FALTA |
| Monto variable (no fijo) | FALTA — action siempre usa cuota_mensual |
| Estado CANCELADO | IMPLEMENTADO |

---

## 7. Ambigüedades y decisiones pendientes

Resumen de todas las decisiones que Pinky debe tomar antes de implementar Fase 2:

| # | Decisión | Impacto en implementación |
|---|----------|--------------------------|
| DP-1 | ¿La deuda con Memas tiene interés? | Si sí: agregar `interes_porcentaje` al schema y recalcular el plan de pagos |
| DP-2 | ¿La deuda está indexada a dólar o inflación? | Si sí: agregar tipo de cambio/índice al schema; la cuota en ARS varía cada mes |
| DP-3 | ¿Se quiere trackear atrasos? ¿Agregar `mes_correspondiente` a cada cuota? | Bajo impacto en DB, alto impacto en reportes y alertas |
| DP-4 | ¿El sistema debe alertar si llega el 1ro del mes y no se registró la cuota? | Requiere lógica de fechas y posiblemente notificación |
| DP-5 | ¿El widget de Memas aparece en el dashboard principal de admin? | Sí según KPIs del PRD (Sección 17). Debe coordinarse con el plan del dashboard |
| DP-6 | ¿Pinky quiere poder editar o anular una cuota mal registrada? | Actualmente no hay delete/edit en cuotas. ¿Solo admin? |
| DP-7 | ¿Storage para comprobantes ya está configurado (Vercel Blob)? | Blob token está en variables de entorno de Fase 2. Si no está configurado, la feature de comprobante no se puede hacer |

---

## 8. Scope recomendado para Fase 2

Basado en lo que ya existe y lo que el PRD requiere, el agente de Planning debería dividir así:

### Lo que sí entra en Fase 2 (PRD lo requiere, no está hecho)

1. **Campo de monto editable** al registrar cuota — formulario real en lugar de action ciega
2. **Proyección de fecha de cancelación** — cálculo y render en la UI
3. **Barra de progreso** — `(total_pagado / valor_llave_total) × 100`
4. **Upload de comprobante** (si Vercel Blob está configurado — DP-7)
5. **Widget de Memas en dashboard** — saldo pendiente + % avance (coordinar con plan del dashboard)

### Lo que NO entra hasta confirmar las DPs

- Indexación por inflación o dólar (DP-1, DP-2)
- Sistema de alertas por cuota atrasada (DP-3, DP-4)
- Edición o anulación de cuotas registradas (DP-6)

### Estimación de trabajo

- Formulario con monto editable + proyección + barra de progreso: ~2 horas
- Upload de comprobante (con Blob): ~1 hora adicional si Blob ya está configurado
- Widget en dashboard: ~1 hora (coordinar con el plan del dashboard financiero)

---

*Documento generado por agente Q&A — A51 Barber — 28/03/2026*
*Revisión requerida de Pinky sobre DP-1, DP-2, DP-3, DP-4, DP-6, DP-7 antes de que Planning pueda producir el plan de implementación.*
