# Plan: Selector de Productos en Formulario de Atención

**Fecha:** 30/03/2026
**Estado:** completado
**PRD ref:** Sección 11.2

---

## Contexto actual

- La tabla `atenciones` NO tiene relación con productos. Solo registra servicio + adicionales.
- Los productos se venden por separado en `/caja/vender` con su propio formulario y acción.
- La venta de producto crea un `stock_movimientos` con tipo "venta" y guarda el medioPagoId en el campo `notas`.
- `AtencionForm` ya recibe listas de barberos, servicios, adicionales y medios de pago como props.
- El formulario tiene una estructura de secciones (barbero → servicio → adicionales → precio → medio pago → notas).

## Objetivo

Agregar un selector de productos **dentro** del formulario de atención, para que el barbero pueda cobrar corte + productos en un solo submit. Los productos se suman al total pero se registran como movimientos de stock separados.

---

## Cambios

### 1. Tabla de enlace atención-productos

**Archivo:** `src/db/schema.ts`

Nueva tabla `atenciones_productos`:
```ts
export const atencionesProductos = pgTable("atenciones_productos", {
  id: uuid().primaryKey().defaultRandom(),
  atencionId: uuid().references(() => atenciones.id),
  productoId: uuid().references(() => productos.id),
  cantidad: integer().notNull().default(1),
  precioUnitario: numeric({ precision: 12, scale: 2 }).notNull(),
  costoUnitarioSnapshot: numeric({ precision: 12, scale: 2 }),
});
```

- `precioUnitario`: snapshot del precio de venta al momento
- `costoUnitarioSnapshot`: para cálculo de margen
- No necesita `medioPagoId` propio — usa el de la atención

Correr `npm run db:push` después de agregar.

### 2. UI del selector en AtencionForm

**Archivo:** `src/components/caja/AtencionForm.tsx`

**Nuevo prop:**
```ts
productosList: Array<{
  id: string;
  nombre: string;
  precioVenta: string | null;
  stockActual: number | null;
}>
```

**Ubicación en el form:** después de adicionales, antes del precio cobrado.

**Comportamiento:**
- Botón "＋ Agregar producto" que muestra/oculta un panel inline (no modal — menos fricción mobile)
- El panel muestra cards de productos con stock > 0: nombre, precio, stock disponible
- Al tocar un producto: se agrega a la lista con cantidad 1
- Si ya está en la lista: incrementa cantidad (máximo = stock disponible)
- Lista de productos seleccionados visible debajo del botón:
  - Cada ítem: nombre × cantidad — $X.XXX + botón ✕ para eliminar
  - Botón +/- para ajustar cantidad
- **Subtotal de productos** visible

**Impacto en precio:**
- El `precioCobrado` del servicio NO cambia — sigue siendo el precio del corte
- Los productos son un **subtotal aparte**
- Mostrar en resumen pre-confirmación:
  ```
  Servicio: $13.000
  Productos: Cera ($5.000) + Café ($1.500) = $6.500
  ─────────
  Total a cobrar: $19.500
  ```

**Datos del form submit:**
- Agregar hidden inputs: `productosIds[]`, `productosCantidades[]`, `productosPrecio[]`
- O un solo hidden input con JSON: `productosSeleccionados` = `[{id, cantidad, precioUnitario}]`

### 3. Server action actualizada

**Archivo:** `src/app/(barbero)/caja/actions.ts` — función `registrarAtencion`

Extraer del formData:
```ts
const productosRaw = formData.get("productosSeleccionados") as string;
const productos = productosRaw ? JSON.parse(productosRaw) : [];
```

Validar:
- Cada producto existe y está activo
- Stock >= cantidad pedida
- precioUnitario >= 0

**Archivo:** `src/lib/caja-atencion.ts` — función `crearAtencionDesdeInput`

Agregar parámetro opcional:
```ts
productos?: Array<{ productoId: string; cantidad: number; precioUnitario: number }>;
```

Dentro de la transacción (o secuencia de inserts):
1. Insertar la atención (sin cambios)
2. Insertar adicionales (sin cambios)
3. **Para cada producto:**
   - Insertar en `atenciones_productos` con snapshot de precio y costo
   - Insertar en `stock_movimientos` tipo "venta" con `referenciaId = atencionId`
   - Decrementar `productos.stockActual`

### 4. Page loader

**Archivo:** `src/app/(barbero)/caja/nueva/page.tsx`

Agregar query de productos activos con stock > 0:
```ts
const productosList = await db
  .select({ id: productos.id, nombre: productos.nombre, precioVenta: productos.precioVenta, stockActual: productos.stockActual })
  .from(productos)
  .where(and(eq(productos.activo, true), gt(productos.stockActual, 0)));
```

Pasar `productosList` al `AtencionForm`.

Hacer lo mismo en `src/app/(barbero)/caja/[id]/editar/page.tsx` si la edición debe soportar productos.

### 5. Relación con `/caja/vender`

La página `/caja/vender` **se mantiene** como opción para vender productos sin corte (ej: cliente que solo viene a comprar cera). No se elimina.

### 6. Visualización en caja y cierre

**Archivo:** `src/app/(barbero)/caja/page.tsx` (lista de atenciones del día)

Si una atención tiene productos asociados, mostrar debajo del servicio:
- "＋ Cera, Café" (nombres de productos)
- O un badge: "2 productos"

**Archivo:** `src/app/(barbero)/caja/cierre/page.tsx`

Los productos vendidos desde atenciones ya se contabilizan en `stock_movimientos` como ventas, así que el cierre los incluye automáticamente en el total de productos. Verificar que no se duplique.

---

## Schema migration

Requiere `npm run db:push` para crear la tabla `atenciones_productos`.

---

## Archivos a tocar

| Archivo | Cambio |
|---|---|
| `src/db/schema.ts` | Nueva tabla `atenciones_productos` |
| `src/components/caja/AtencionForm.tsx` | Selector de productos, subtotal, hidden inputs |
| `src/app/(barbero)/caja/actions.ts` | Parse y validar productos del formData |
| `src/lib/caja-atencion.ts` | Crear registros de producto + stock movement |
| `src/app/(barbero)/caja/nueva/page.tsx` | Query y pasar productosList |
| `src/app/(barbero)/caja/page.tsx` | Mostrar productos asociados en lista |

## Verificación

- [ ] Registrar atención sin productos (flujo existente intacto)
- [ ] Registrar atención con 1 producto — stock se decrementa
- [ ] Registrar atención con 2+ productos distintos
- [ ] No se puede seleccionar más cantidad que stock
- [ ] Total muestra servicio + productos separado
- [ ] Producto aparece en stock_movimientos como venta
- [ ] Cierre de caja no duplica productos
- [ ] `/caja/vender` sigue funcionando independiente
- [ ] `npm run build` sin errores
