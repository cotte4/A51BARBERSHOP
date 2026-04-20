# Research Fase 3 — A51 Barber

**Fecha:** 29/03/2026
**Autor:** Research Agent
**Contexto:** Una sola barbería, Mar del Plata, Argentina. Moneda ARS. Stack: Next.js + Neon + Drizzle + Better Auth + Vercel. Equipo: 2 personas (Pinky + Gabote).

---

## Eje 1 — E-commerce online

### Contexto del negocio

A51 vende productos de barbería en mostrador (cera, shampoo, aceites). Un e-commerce online implicaría vender esos mismos productos a clientes que no vienen físicamente, o habilitar la preventa/reserva de productos antes del turno. Para una sola barbería en Mar del Plata con dos personas operando, el volumen esperado de ventas online es bajo al inicio.

### Opciones evaluadas

#### Opción A — TiendaNube (plataforma externa)

- Plataforma de e-commerce SaaS líder en Argentina y Latam.
- Plan inicial gratuito con comisión por venta (~2% en ventas), planes pagos desde ~ARS 15.000-30.000/mes (precios actualizados frecuentemente).
- Integración con MercadoPago nativa, sin código.
- Gestión de catálogo, stock, envíos y medios de pago fuera del sistema A51.
- **Ventaja:** cero desarrollo, operativo en horas, todos los medios de pago incluidos.
- **Desventaja:** stock duplicado (TiendaNube no sabe lo que hay en A51), sin integración con el inventario interno del sistema, genera dos sistemas paralelos.

#### Opción B — MercadoPago Tienda (Tienda MP)

- Funcionalidad básica de vitrina online que ofrece MercadoPago directamente.
- Sin costo de setup, comisiones estándar de MP (~3.99% para tarjeta de crédito, varía por cuotas).
- Muy limitado en customización y catálogo.
- **Ventaja:** casi cero setup.
- **Desventaja:** muy básico, no integrable con el sistema A51, experiencia de usuario pobre.

#### Opción C — E-commerce propio dentro del sistema A51

- Catálogo de productos ya existe en la base de datos (tabla `productos`).
- Se agregaría un flujo público de compra: catálogo público → carrito → pago online → descuento de stock automático.
- **Stack adicional necesario:**
  - `@mercadopago/sdk-js` (frontend) + `mercadopago` npm package (backend) para Checkout Pro.
  - Tabla `pedidos_online` con estados (pendiente, pagado, preparando, entregado).
  - Webhook handler para confirmar pagos asíncronos de MercadoPago.
  - Lógica de reserva de stock vs. stock confirmado.
- **Ventaja:** inventario unificado, sin costo de plataforma, experiencia personalizada.
- **Desventaja:** 3-5 días de desarrollo mínimo solo para el flujo básico, más complejidad operativa (¿quién prepara y despacha? ¿hay envíos o solo retiro en local?).

### Integración de pagos en Argentina

#### MercadoPago Checkout Pro

- **Disponibilidad:** 100% disponible en Argentina, es el estándar del mercado.
- **Integración con Next.js:** oficial y documentada. El SDK de backend (`mercadopago` en npm) crea la preferencia de pago en un API Route de Next.js y el frontend redirige al checkout de MP o embebe el brick.
- **Comisiones:** ~3.99% tarjeta de crédito 1 cuota, baja con cuotas sin interés según acuerdo comercial. Transferencia/débito: ~0.8-1.5%.
- **Webhooks:** soporte nativo para confirmar pagos en async.
- **Complejidad técnica:** baja. Un API Route para crear preferencia + un webhook handler = 1 día de trabajo.

#### MercadoPago Checkout Bricks

- Versión embebida (no redirige). Más moderna, permite embeber el formulario de pago directamente en la app.
- Mismas comisiones que Checkout Pro.
- Complejidad similar, mejor UX.

#### Stripe

- **Disponibilidad en Argentina:** Stripe permite cobrar a clientes argentinos desde una cuenta creada en otro país (USA, Europa), pero **no permite abrir una cuenta Stripe con CUIT argentino para recibir fondos en Argentina directamente**. El dinero debería recibirse en el exterior.
- **Veredicto:** No aplica para A51. MercadoPago es la única opción práctica para cobrar en ARS y recibir en cuenta bancaria argentina.

#### Modo / Boa Compra / otras

- Modo: billetera digital de bancos argentinos. No tiene SDK público de e-commerce.
- Getnet, Todo Pago: alternativas pero con integración más compleja y menor adopción.

### Recomendacion para E-commerce

**No implementar en Fase 3. Si el negocio crece y lo justifica, usar TiendaNube.**

Justificación:
1. A51 es una barbería de barrio, no un retailer. El e-commerce de productos de barbería tiene sentido solo si hay volumen de clientes que piden productos online. Eso tarda al menos 12-18 meses en desarrollarse.
2. TiendaNube resuelve el problema en horas sin código, con todos los medios de pago integrados y un panel de gestión ya hecho. El único costo es la comisión por venta.
3. Un e-commerce propio con MercadoPago requiere 3-5 días de desarrollo + mantenimiento + gestión del stock duplicado. El ROI es negativo para el volumen esperado.
4. Si en el futuro se decide integrar TiendaNube con el inventario de A51, hay opciones via API de TiendaNube. Pero eso sería Fase 4, no Fase 3.

**Acción concreta si el negocio lo pide:** abrir TiendaNube en el plan gratuito con los productos del catálogo. Sin código, sin integración al sistema. Stock manejado manualmente hasta que el volumen lo justifique.

---

## Eje 2 — Integración contable avanzada

### Contexto legal de una barbería en Argentina

Una barbería puede operar bajo distintos regímenes:
- **Monotributo:** el más común para pequeños negocios. Factura con "Comprobante de Venta" tipo C. No liquida IVA. Solo declaración anual de ingresos para categorización.
- **Responsable Inscripto:** si supera el tope de facturación del monotributo (~ARS 68 millones anuales en 2025, actualizable). Debe hacer libro IVA, declarar IVA mensualmente, llevar contabilidad formal.
- **Empleados:** si Gabote es empleado en relación de dependencia, hay cargas sociales (SIPA, obra social, ART). Si es independiente (contratado), factura aparte.

Para A51 al inicio (2026), el régimen más probable es **monotributo o pequeña empresa** con eventual paso a RI si supera los topes.

### Qué implica "integración contable" para A51

| Necesidad | Complejidad | ¿Urgente? |
|---|---|---|
| Emitir facturas electrónicas (AFIP) | Alta | Solo si son RI o el cliente la pide |
| Declarar monotributo anual | Baja (es manual en AFIP) | No requiere sistema |
| Liquidar IVA mensual | Alta | Solo si son RI |
| Calcular cargas sociales de Gabote | Media | Depende del tipo de contrato |
| Exportar datos para contador | Baja | Se puede hacer con un CSV |

### Opciones de software contable

#### AFIP Web Services directos

- AFIP tiene Web Services (WSFE) para emitir facturas electrónicas directamente desde código.
- Requiere: certificado digital, CUIT, alta en servicios de AFIP, manejo de XML.
- **Complejidad:** muy alta. Requiere conocimiento de AFIP, certificados, testing en homologación, etc.
- **Veredicto:** no viable para un solo developer en Fase 3.

#### Xubio

- SaaS contable argentino. Planes desde ~USD 10-20/mes (precio en USD con pago en ARS al tipo de cambio).
- Facturación electrónica, libro IVA, reportes.
- No tiene API pública robusta para integración programática.
- **Veredicto:** buena herramienta para el contador de Pinky, pero no integrable al sistema A51 sin mucho trabajo.

#### Colppy

- SaaS contable orientado a PYMES. Similar a Xubio.
- Tiene API pero orientada a desarrolladores de ERP, no trivial.
- Precio similar a Xubio.

#### Contabilium

- SaaS contable con módulo de facturación electrónica.
- Tiene API REST documentada para emitir comprobantes.
- Planes desde ~USD 15-25/mes.
- Integrable desde Next.js via API Route → Contabilium API.

#### Alegra

- SaaS contable para Latam (Colombia origin, soporte Argentina).
- API REST completa y documentada.
- Facturación electrónica Argentina disponible.
- Precio: desde ~USD 12-20/mes.
- La API permite crear facturas, clientes, productos programáticamente.

#### Factura.com / FacturAPI

- Más orientado a México. No aplica.

### Complejidad de integrar facturación electrónica desde Next.js

Flujo técnico si se integrara (ej. Contabilium o Alegra):
1. Al hacer cierre de caja diario → llamar API del sistema contable.
2. Crear comprobante de venta por el total del día (o por transacción individual).
3. Recibir CAE (Código de Autorización Electrónico) de AFIP via el proveedor.
4. Guardar CAE en la base de datos A51.

**Estimación de trabajo:** 2-3 días para integrar la emisión básica. Más 1-2 días para testing en entorno de homologación. Pero requiere que A51 esté dado de alta en AFIP con las credenciales del proveedor elegido.

### Recomendacion para Integracion Contable

**No integrar en Fase 3. Usar herramienta separada.**

Justificación:
1. Si A51 opera como monotributista, la obligación es minima: solo recategorización anual. No necesita sistema de facturación electrónica.
2. Si en algún momento necesitan emitir facturas (cliente empresa que lo pide), lo hacen manualmente desde el portal de AFIP o con Xubio/Contabilium sin integración al código.
3. El sistema A51 ya registra todos los ingresos con detalle de transacciones. Exportar un CSV mensual al contador es suficiente para la declaración de monotributo o para que el contador arme el libro IVA si pasan a RI.
4. Integrar facturación electrónica tiene un costo de setup + mantenimiento que no justifica el volumen de una barbería pequeña. Un contador cobra ~ARS 30.000-50.000/mes y maneja todo esto sin integración de software.

**Acción concreta:** agregar al cierre mensual un botón "Exportar CSV para contador" que descargue transacciones del mes con fecha, tipo (servicio/producto), monto bruto, medio de pago y monto neto. Con eso, el contador tiene todo lo que necesita. Esto es 2-3 horas de trabajo, no 2-3 días.

---

## Eje 3 — Automatizaciones y notificaciones

### Casos de uso concretos para A51

Del PRD emergen tres casos de uso claros:

| Caso de uso | Urgencia | Canal ideal |
|---|---|---|
| Alerta stock mínimo de producto | Media | WhatsApp o push |
| Recordatorio de hacer cierre diario | Alta | WhatsApp |
| Notificación cuando se genera liquidación mensual | Media | WhatsApp |

Los destinatarios son **Pinky y Gabote**, no clientes externos. Esto simplifica enormemente la solución: no es marketing masivo, son notificaciones operativas a 2 personas.

### Opciones para WhatsApp

#### WhatsApp Business API (Cloud API oficial de Meta)

- API gratuita de Meta para enviar mensajes desde servidor.
- Requiere: número de teléfono dedicado (no puede ser el número personal de Pinky), verificación de negocio en Meta Business Manager.
- Pricing: mensajes de "utilidad" (notificaciones operativas) tienen un costo por conversación. En Argentina, las conversaciones de utilidad iniciadas por empresa cuestan ~USD 0.0253 por conversación de 24hs (precios de 2025, actualizables).
- Para 2 personas y 3 tipos de alertas: el costo mensual es prácticamente cero (menos de USD 5/mes).
- **Complejidad técnica:** media. Requiere setup en Meta Developer Portal + número dedicado + lógica de envío en API Route de Next.js. Aproximadamente 1-2 días de setup inicial.
- **Ventaja:** es el canal donde ya está todo el mundo. Pinky y Gabote lo usan naturalmente.

#### Twilio WhatsApp

- Twilio es intermediario que usa la misma API de Meta.
- Agrega un costo adicional (~USD 0.005/mensaje) sobre el costo de Meta.
- **Ventaja:** SDK muy bueno para Node.js/TypeScript, documentación excelente, setup más rápido (3-4 horas vs 1-2 días de Meta directo).
- **Desventaja:** doble costo (Twilio + Meta).
- **Precio estimado para A51:** menos de USD 10/mes considerando el uso mínimo.

#### WATI

- Plataforma sobre la API de Meta, orientada a equipos de soporte y marketing.
- Precio desde USD 49/mes para el plan más básico.
- Overkill para 2 personas con notificaciones operativas simples.
- **Veredicto:** no aplica.

#### 360dialog

- Proveedor oficial de API de Meta, orientado a volumen alto (agencias, e-commerce).
- Setup fee + mensual.
- **Veredicto:** no aplica para este caso de uso.

### Opciones para Push Notifications web

#### Web Push API nativa

- Estándar del navegador. Funciona en Chrome, Firefox, Edge. Safari en iOS tiene soporte parcial desde iOS 16.4.
- Requiere: service worker en Next.js, solicitar permiso al usuario, servidor VAPID para enviar notificaciones.
- **Complejidad:** media-alta. Configurar service worker + VAPID + manejo de permisos en Next.js App Router es 1-2 días.
- **Limitación crítica:** los usuarios tienen que haber dado permiso desde el navegador. Si Pinky o Gabote usan la app en modo PWA en el celular, puede funcionar. Si la app no está instalada como PWA, las notificaciones push no llegarán cuando el browser esté cerrado en iOS.

#### OneSignal

- Plataforma de push notifications con plan gratuito hasta 10.000 suscriptores.
- SDK para Next.js disponible.
- Web Push + In-app notifications.
- **Complejidad:** baja. SDK oficial, dashboard para gestionar notificaciones, webhooks para disparar desde el backend.
- **Precio:** gratuito para el volumen de A51.

#### Novu

- Plataforma open source de notificaciones multi-canal (email, SMS, push, in-app).
- Self-hosteable o cloud (plan gratuito hasta 30.000 eventos/mes).
- Soporta múltiples canales con una sola integración.
- **Complejidad:** media. Requiere configurar canales pero abstrae mucho trabajo.

### Evaluación: WhatsApp vs Push para A51

| Criterio | WhatsApp (Twilio) | Web Push (OneSignal) |
|---|---|---|
| Probabilidad de que llegue | Muy alta | Media (depende de PWA/permiso) |
| Setup | 4-6 horas | 4-6 horas |
| Costo mensual | < USD 10 | Gratis |
| Funciona sin abrir la app | Si | Solo si hay service worker activo |
| Requiere número dedicado | Si | No |
| UX para el destinatario | Natural (ya usan WA) | Requiere aceptar permiso |

### Recomendacion para Automatizaciones y Notificaciones

**Implementar en Fase 3 usando Twilio WhatsApp para notificaciones operativas a Pinky.**

Justificación:
1. WhatsApp tiene probabilidad de llegada prácticamente del 100% para notificaciones críticas. Un push de browser puede ignorarse o no llegar.
2. Twilio tiene el mejor SDK de Node.js/TypeScript, se integra en 4-6 horas a un API Route de Next.js, y el costo para el uso de A51 es menor a USD 10/mes.
3. Los tres casos de uso (stock mínimo, recordatorio cierre diario, liquidación mensual) son notificaciones operativas para Pinky, no para clientes. Son mensajes puntuales, no campañas.
4. Push notifications web requieren que el usuario tenga la PWA instalada y haya dado permiso. Para Gabote, que usa la app solo para ver sus liquidaciones, no vale la pena el overhead.

**Implementación concreta:**

```typescript
// En un API Route de Next.js (/api/notifications/whatsapp)
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendWhatsAppAlert(to: string, message: string) {
  return client.messages.create({
    from: 'whatsapp:+14155238886', // número de sandbox Twilio o número verificado
    to: `whatsapp:${to}`,
    body: message,
  });
}
```

**Triggers a implementar:**

1. **Stock mínimo:** hook en `stock_movimientos` — si al registrar una salida el stock queda <= `stock_minimo`, disparar alerta a Pinky.
2. **Recordatorio cierre diario:** cron job via Vercel Cron (disponible en plan Hobby) a las 22:00 hs Argentina — verificar si el día actual tiene cierre registrado. Si no, enviar WA a Pinky.
3. **Liquidación generada:** al crear registro en `liquidaciones`, enviar WA a Pinky con el resumen y a Gabote con su monto a cobrar.

**Vercel Cron** para el recordatorio de cierre: disponible en todos los planes de Vercel, se define en `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/recordatorio-cierre",
    "schedule": "0 1 * * *"
  }]
}
```

(01:00 UTC = 22:00 ARS en horario de verano)

---

## Resumen ejecutivo

| Eje | Recomendacion | Costo estimado | Esfuerzo |
|---|---|---|---|
| E-commerce | No implementar en Fase 3. Si surge demanda, usar TiendaNube (sin código) | ARS 0 ahora / comisión por venta si se abre TiendaNube | 0 días dev |
| Contabilidad | No integrar. Agregar exportación CSV al cierre mensual para el contador | 0 (ya lo hace el sistema) | 2-3 horas |
| Notificaciones | Twilio WhatsApp para alertas operativas a Pinky + Vercel Cron para recordatorio cierre | < USD 10/mes | 1-2 días dev |

### Prioridad recomendada dentro de Fase 3

Si se decide arrancar Fase 3, el orden lógico es:

1. **Notificaciones WhatsApp** — impacto operativo inmediato, bajo costo, 1-2 días de trabajo.
2. **Exportacion CSV contable** — 2-3 horas, resuelve la necesidad del contador sin complejidad.
3. **E-commerce** — solo si Pinky confirma que hay demanda de clientes. Empezar con TiendaNube, sin código.

### Prerequisitos de Fase 3

- Fases 1 y 2 estables en producción con datos reales.
- Al menos 2-3 meses de operación real para validar que las notificaciones son necesarias.
- Decidir régimen impositivo (monotributo vs RI) antes de evaluar integración contable.
- Confirmar si Pinky quiere un número de WhatsApp separado para el sistema o usar el personal.
