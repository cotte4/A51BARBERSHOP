# Q&A: Presupuesto Mensual Configurable para el BEP
Date: 28/03/2026
Status: decision

---

## Contexto

El BEP diario y la proyección del mes necesitan un número de "gastos fijos de referencia" cuando el mes todavía no tiene gastos reales cargados. Hasta ahora ese número estaba hardcodeado en el PRD como $1.956.686 ARS. Ese número:

- Va a cambiar mes a mes por inflación
- No es definitivo — Pinky necesita actualizarlo sin tocar código
- Necesita estar disponible como valor de referencia para el cálculo del BEP (fórmula 5.3 del plan de dashboard)

---

## Decisiones

### 1. Dónde vive el dato

**Solución: campo nuevo en la tabla `configuracion_negocio` (singleton).**

No existe todavía una tabla `configuracion_negocio`, pero es la ubicación correcta. Las razones:

- El presupuesto mensual es un parámetro de negocio, no un gasto real. La tabla `gastos` registra erogaciones concretas con fecha y comprobante — no es el lugar para un número de referencia del modelo.
- No se necesita histórico por mes. El dashboard ya tiene los gastos reales por mes en la tabla `gastos`; el presupuesto solo se usa como fallback cuando esos datos no están. Guardar un histórico de versiones del presupuesto agrega complejidad sin ningún beneficio para las fórmulas actuales.
- Una tabla singleton (`configuracion_negocio` con un único row) es el patrón más simple, extendible, y alineado con cómo ya funciona Fase 1B (la configuración de barberos y medios de pago vive en tablas propias, no en un key-value store genérico).
- Alternativa descartada: agregar una columna `presupuesto_mensual` a una tabla existente como `barberos` o `temporadas` — no tiene semántica correcta.

**Schema a agregar (migración única, mínima):**

```sql
-- Drizzle schema
configuracion_negocio (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presupuesto_mensual_gastos  INTEGER NOT NULL DEFAULT 1956686,
  -- campo para futuras configs de negocio (ej: cuota_memas, alquiler_banco)
  -- se agrega aquí para no hacer nueva migración luego
  actualizado_en  TIMESTAMPTZ DEFAULT now(),
  actualizado_por TEXT  -- email del admin que editó
)
```

- Un único row, creado en el seed con el valor del PRD ($1.956.686).
- `DEFAULT 1956686` garantiza que si la tabla existe pero el row no, la query no rompe.
- `actualizado_en` y `actualizado_por` permiten mostrar "Última actualización: hace 3 días por pinky@a51.com" en la UI — dato clave para la alerta de desactualización.

**El seed crea el row:**

```ts
await db.insert(configuracionNegocio).values({
  presupuesto_mensual_gastos: 1956686,
  actualizado_por: 'seed',
}).onConflictDoNothing()
```

---

### 2. Qué campos necesita

**Solución: solo el total mensual. Sin desglose por categoría.**

El BEP y la proyección del mes usan un único número: el total de gastos fijos del mes. Las fórmulas en el plan de dashboard (secciones 5.3 y 5.5) operan sobre `gastos_fijos_referencia` como escalar — no iteran sobre categorías.

El desglose por categoría (alquiler, servicios, sueldos) ya existe en la tabla `gastos` cuando hay gastos reales cargados. El presupuesto de referencia no duplica eso — es solo el denominador de la fracción diaria del BEP.

Si en el futuro Pinky quiere comparar "presupuestado vs. real por categoría", se extiende el schema. No ahora.

---

### 3. Desde dónde lo edita Pinky

**Solución: desde el módulo de Configuración (Fase 1B), sección nueva "Negocio".**

Ruta: `/configuracion/negocio`

Justificación:
- El módulo `/configuracion` ya existe y Pinky ya sabe ir ahí para cambiar parámetros del negocio.
- Agregar una sección "Negocio" en la `ConfNavBar.tsx` existente (junto a Barberos / Servicios / Medios de Pago / Gastos Fijos) es 1 item más en la nav — sin nueva sección de la app, sin nueva URL raíz.
- El dashboard NO es el lugar para editar este dato: el dashboard es lectura. Mezclar edición en el dashboard crea confusión sobre qué es configuración y qué es reporte.
- Alternativa descartada: pantalla dedicada fuera de `/configuracion`. Fragmenta la navegación sin beneficio.

**Implementación de la página:**

```
/src/app/(admin)/configuracion/negocio/
  page.tsx      — formulario simple: 1 campo "Presupuesto mensual de gastos fijos (ARS)"
  actions.ts    — Server Action: actualizar configuracion_negocio
```

Formulario: 1 campo numérico con label explicativo, subtexto "Este valor se usa para calcular el BEP cuando el mes no tiene gastos cargados aún", botón "Guardar". Muestra `actualizado_en` y `actualizado_por` debajo del campo ("Último cambio: 15/03/2026 por pinky@a51.com").

No hay historial de cambios en la UI — no es necesario para las fórmulas actuales.

---

### 4. Alertas

**Dos alertas, bien diferenciadas:**

#### Alerta A: Presupuesto nunca configurado (valor de seed intacto)
Condición: `configuracion_negocio.actualizado_por = 'seed'`

Donde mostrar: banner amarillo en `/dashboard` (página principal), inline debajo del `BepWidget`.

Texto: `"El BEP usa el presupuesto del modelo ($1.956.686). Actualizalo en Configuración > Negocio."`

El BEP sigue funcionando con el valor de seed — no se bloquea la UI ni se muestra error. El dato es válido, solo está desactualizado.

#### Alerta B: Presupuesto desactualizado (más de 30 días sin tocar)
Condición: `configuracion_negocio.actualizado_en < now() - interval '30 days'` Y `actualizado_por != 'seed'`

Donde mostrar: mismo lugar que alerta A, pero como banner gris (menos urgente que amarillo).

Texto: `"El presupuesto de gastos fijos no se actualiza desde hace más de 30 días. ¿Querés revisarlo?"`

Link directo a `/configuracion/negocio` en ambos banners.

**El BepWidget** siempre muestra la fuente del cálculo:
- `"(base: gastos reales del mes)"` — cuando hay gastos cargados
- `"(base: presupuesto $X.XXX.XXX)"` — cuando usa el valor de configuracion_negocio

Esto ya estaba diseñado en el plan de dashboard (sección 5.3) — solo hay que alimentar el campo `fuente_gastos` del widget con el valor real de la tabla en lugar del hardcode.

---

### 5. Impacto en el schema

**Requiere una migración, pero es mínima.**

Cambios:
1. Nueva tabla `configuracion_negocio` — 1 tabla, 4 columnas, 1 row.
2. Seed actualizado — agregar `insertConfiguracionNegocio()` al seed existente.
3. Drizzle schema — agregar la tabla al archivo de schema.

No se modifica ninguna tabla existente. No hay foreign keys. No hay cambio en las tablas de Fase 1B.

**Archivos a crear/modificar:**

| Archivo | Acción |
|---------|--------|
| `src/db/schema.ts` | Agregar tabla `configuracionNegocio` |
| `src/db/seed.ts` | Agregar insert del row inicial |
| `drizzle/migrations/...` | Nueva migración generada por `drizzle-kit generate` |
| `src/app/(admin)/configuracion/negocio/page.tsx` | Nuevo — formulario |
| `src/app/(admin)/configuracion/negocio/actions.ts` | Nuevo — Server Action update |
| `src/components/configuracion/ConfNavBar.tsx` | Agregar item "Negocio" a la nav |
| `src/api/dashboard/kpis-dia/route.ts` | Leer `presupuesto_mensual_gastos` de DB en lugar de hardcode |
| `src/api/dashboard/kpis-mes/route.ts` | Igual |
| `src/components/dashboard/BepWidget.tsx` | Recibir `presupuesto_configurado` y `presupuesto_actualizado_en` para mostrar alerta |
| `src/app/(admin)/dashboard/page.tsx` | Agregar lógica de banner de alerta |

---

## Resumen para el coding agent

1. Crear tabla `configuracion_negocio` con los campos listados arriba. Migrar.
2. Seed: 1 row con `presupuesto_mensual_gastos = 1956686`, `actualizado_por = 'seed'`.
3. Crear `/configuracion/negocio/page.tsx` + `actions.ts`. Agregar a `ConfNavBar.tsx`.
4. En las API routes del dashboard que calculan BEP (`kpis-dia`, `kpis-mes`): reemplazar el hardcode `1956686` por un `db.query.configuracionNegocio.findFirst()`. La lógica del fallback (gastos reales > 0 → usar reales, else → usar presupuesto) no cambia.
5. En `/dashboard/page.tsx`: después del fetch de KPIs, hacer un `db.query.configuracionNegocio.findFirst()` adicional. Si `actualizado_por = 'seed'` → mostrar banner amarillo. Si `actualizado_en < 30 días` → mostrar banner gris. Pasar estos flags al componente de la página como props.
6. `BepWidget` ya tiene el campo `fuente_gastos` — solo asegurarse de que el valor sea `"presupuesto $X.XXX.XXX"` con el número real leído de DB, no hardcodeado.

No hay cambios en las fórmulas financieras. Solo se reemplaza el literal `1956686` por una lectura de DB.
