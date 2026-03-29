# Plan: Fase 1A - Setup
Date: 27/03/2026
Status: draft

## Que construye este plan

Deja lista la base tecnica del proyecto:

- Next.js 16.2.1
- Neon
- Drizzle
- Better Auth
- proxy de rutas
- seed inicial

## Estructura minima

- `src/app`
- `src/db`
- `src/lib`
- `src/proxy.ts`
- `src/app/api/auth/[...all]/route.ts`

## Base de datos

Tablas de negocio esperadas:

- `barberos`
- `servicios`
- `servicios_adicionales`
- `servicios_precios_historial`
- `temporadas`
- `medios_pago`
- `atenciones`
- `atenciones_adicionales`
- `productos`
- `stock_movimientos`
- `cierres_caja`
- `categorias_gasto`
- `gastos`
- `liquidaciones`
- `repago_memas`
- `repago_memas_cuotas`

## Auth y permisos

- Better Auth con roles `admin` y `barbero`
- proxy en `src/proxy.ts`
- root `/` redirige por rol
- area admin protegida
- area caja protegida por sesion

## Tareas

1. Inicializar app.
2. Configurar Drizzle y Neon.
3. Definir schema.
4. Configurar Better Auth.
5. Crear handler auth.
6. Crear `src/proxy.ts`.
7. Seed con Pinky y Gabote.

## Acceptance criteria

- schema aplicado sin errores
- login funcional
- Pinky entra a `/dashboard`
- Gabote entra a `/caja`
- rutas protegidas por proxy
