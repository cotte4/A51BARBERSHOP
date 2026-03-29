# Research: @react-pdf/renderer + Vercel Blob — A51 Barber

> Investigado: 2026-03-28
> Contexto: Next.js **16.2.1** + React 19 + TypeScript, desplegado en Vercel

---

## HALLAZGO CLAVE: El proyecto usa Next.js 16, no 14

El `package.json` del proyecto tiene `"next": "16.2.1"`. Esto cambia la configuración respecto a las guías antiguas de Next.js 14.

---

## 1. @react-pdf/renderer en Next.js 16 App Router

### ¿`serverComponentsExternalPackages` o `serverExternalPackages`?

| Versión de Next.js | Config correcta |
|---|---|
| <= 14.0.x | `experimental.serverComponentsExternalPackages` |
| 15.x y 16.x (estable) | `serverExternalPackages` (top-level, sin `experimental`) |

**En Next.js 15+ el nombre fue estabilizado y movido fuera de `experimental`.** Usar el nombre viejo dentro de `experimental` genera un warning y puede ser ignorado silenciosamente.

### next.config.ts — Config lista para copiar-pegar

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Excluye @react-pdf/renderer del bundle del servidor.
  // Obligatorio en Next.js 15+: usa el runtime Node.js, no Edge.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
```

**No se necesita `transpilePackages`** para este caso. `transpilePackages` es para paquetes ESM que el bundler no puede procesar — `@react-pdf/renderer` v4.x ya viene con un build CJS compatible.

### Versión recomendada

```
@react-pdf/renderer@^4.3.2
```

Es la última estable (publicada ~diciembre 2025). Compatible con React 19.

```bash
npm install @react-pdf/renderer
```

### Uso en un Route Handler (API Route)

El PDF debe generarse **solo en el servidor** con Node.js runtime. Nunca en Edge Runtime.

```typescript
// app/api/presupuesto/pdf/route.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { PresupuestoPDF } from "@/components/pdf/PresupuestoPDF";

// CRITICO: forzar Node.js runtime, nunca edge
export const runtime = "nodejs";

export async function GET(request: Request) {
  const buffer = await renderToBuffer(<PresupuestoPDF />);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="presupuesto.pdf"',
    },
  });
}
```

Para componentes del cliente que necesiten mostrar un link de descarga, usar dynamic import con `ssr: false`:

```typescript
// Dentro de un Client Component
import dynamic from "next/dynamic";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);
```

### Gotchas y problemas conocidos

1. **Edge Runtime rompe todo.** Si un Route Handler no tiene `export const runtime = "nodejs"` y Vercel lo despliega como Edge Function, falla con `ERR_REQUIRE_ESM` o errores de módulos Node.js faltantes. Siempre declarar el runtime explícitamente.

2. **`@react-pdf/renderer` aparece en la lista de auto-opt-out de Next.js.** Desde Next.js 15, Next.js tiene una lista interna de paquetes que automáticamente externaliza. `@react-pdf/renderer` puede estar ya incluida. De todas formas, declararlo explícitamente en `serverExternalPackages` es la práctica segura y no genera conflicto.

3. **No importar en Client Components sin dynamic import.** Si un componente con `"use client"` importa directamente `@react-pdf/renderer`, el build falla porque el paquete usa APIs de Node.js. Usar siempre el patrón de dynamic import con `ssr: false`.

4. **Fonts en Vercel.** Si registrás fuentes custom con `Font.register()`, los paths deben ser URLs absolutas (`https://...`) en producción. Las rutas relativas del filesystem no funcionan en Vercel Functions.

---

## 2. Vercel Blob — Setup completo

### Instalación

```bash
npm install @vercel/blob
```

### Cómo crear el Blob Store y obtener el token

**Pasos en el dashboard de Vercel:**

1. Ir a **vercel.com/dashboard** → seleccionar el proyecto
2. Tab **"Storage"** (barra lateral izquierda)
3. Click **"Create Database"** → seleccionar **"Blob"**
4. Nombrar el store (ej: `a51-barber-blob`) → **"Create"**
5. Vercel crea automáticamente la variable de entorno `BLOB_READ_WRITE_TOKEN` y la conecta al proyecto en todos los environments (Production, Preview, Development)
6. Para usar localmente: ejecutar `vercel env pull .env.local` con la Vercel CLI

El token también es visible en: **Project → Settings → Environment Variables → `BLOB_READ_WRITE_TOKEN`**

### Variable de entorno necesaria

```env
# .env.local (solo local — Vercel la inyecta automáticamente en prod)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx
```

**Nunca commitear este archivo.** Asegurarse que `.env.local` está en `.gitignore`.

### Patrón básico de upload — Route Handler

```typescript
// app/api/upload/route.ts
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("filename");

  if (!filename) {
    return NextResponse.json({ error: "filename requerido" }, { status: 400 });
  }

  const blob = await put(filename, request.body!, {
    access: "public",       // "public" | "private"
    addRandomSuffix: true,  // evita colisiones de nombre
  });

  return NextResponse.json(blob);
  // blob = { url, downloadUrl, pathname, contentType, contentDisposition }
}
```

### Patrón de upload desde el cliente

```typescript
// Desde un componente React
const response = await fetch(`/api/upload?filename=${file.name}`, {
  method: "POST",
  body: file, // File object del input
});
const blob = await response.json();
console.log(blob.url); // URL pública del archivo
```

### Leer / listar / borrar blobs

```typescript
import { list, del, head } from "@vercel/blob";

// Listar
const { blobs } = await list({ prefix: "presupuestos/" });

// Info de un blob
const blob = await head(url);

// Borrar
await del(url);
// o borrar múltiples
await del([url1, url2]);
```

### Límites del plan gratuito (Hobby)

| Recurso | Límite Hobby |
|---|---|
| Almacenamiento total | **250 MB** |
| Transferencia de datos | Compartida con el plan (100 GB/mes general) |
| Precio excedente | $0.023/GB-mes (storage) + $0.05/GB (transfer) |
| Tamaño máximo por blob | 500 MB (técnico, no del plan) |

**Para A51 Barber:** Los PDFs de presupuestos son livianos (~100KB c/u). Con 250 MB de storage, caben ~2500 PDFs antes de necesitar limpieza o upgrade. Es suficiente para comenzar.

### Gotchas y problemas conocidos

1. **`BLOB_READ_WRITE_TOKEN` no encontrado en desarrollo.** Si no se ejecutó `vercel env pull`, la variable no existe localmente. Ejecutar `vercel env pull .env.local` una vez al configurar el proyecto.

2. **Nunca exponer el token al cliente.** El token tiene permisos de lectura y escritura. Para uploads desde el navegador, usar el patrón `handleUpload` de `@vercel/blob/client` que genera tokens temporales de cliente, o hacer el upload server-side como en el patrón de arriba.

3. **Acceso `private` requiere generar tokens de descarga.** Si se sube un blob con `access: "private"`, la URL no es directamente accesible. Hay que generar una URL firmada con `getDownloadUrl()`. Para PDFs de presupuestos que se quieran compartir con clientes, usar `access: "public"`.

4. **Los blobs `public` son de acceso abierto.** Cualquiera con la URL puede descargarlo. Si los PDFs contienen información sensible, evaluar `access: "private"` + URLs firmadas.

5. **250 MB es el límite del plan Hobby.** Una vez alcanzado, los uploads fallan con error 403. Implementar limpieza periódica de PDFs viejos o hacer upgrade al plan Pro ($20/mes) si el volumen crece.

---

## Resumen para el coding agent

| Tarea | Acción concreta |
|---|---|
| Config next.config.ts | Agregar `serverExternalPackages: ["@react-pdf/renderer"]` al top-level |
| Instalar react-pdf | `npm install @react-pdf/renderer@^4.3.2` |
| Route Handler de PDF | Siempre `export const runtime = "nodejs"` |
| Client Component con PDF link | Dynamic import con `ssr: false` |
| Instalar Vercel Blob | `npm install @vercel/blob` |
| Crear blob store | Dashboard → proyecto → Storage → Create → Blob |
| Token local | `vercel env pull .env.local` |
| Upload en API route | `put(filename, body, { access: "public" })` |

---

## Fuentes consultadas

- [Next.js docs: serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15)
- [react-pdf Issue #2891 — App Router example](https://github.com/diegomura/react-pdf/issues/2891)
- [react-pdf Issue #2460 — renderToBuffer server side](https://github.com/diegomura/react-pdf/issues/2460)
- [Vercel Blob docs: server upload](https://vercel.com/docs/vercel-blob/server-upload)
- [Vercel Blob: using the SDK](https://vercel.com/docs/vercel-blob/using-blob-sdk)
- [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing)
- [@react-pdf/renderer en npm](https://www.npmjs.com/package/@react-pdf/renderer)
