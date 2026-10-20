# QA con agentes-persona

Cinco agentes usan la app como cinco personas reales, cada uno con objetivos (no pasos),
y reportan qué se rompe, qué confunde y qué falta. No reemplaza a los tests E2E: un test
verifica que un camino conocido siga andando; una persona encuentra los caminos que nadie escribió.

## Cómo se corre (nunca contra prod)
1. Branch de Neon `qa-agentes` (copia de prod, se borra al terminar). Su conexión vive en
   `.env.qa.local` (fuera de git). Crearlo: `npx neonctl branches create --project-id aged-art-92659338 --name qa-agentes --parent production`.
2. `npx tsx --conditions=react-server qa/preparar-branch.ts` — corta Spotify, pone la clave de prueba
   y crea barbero, Marciano y turno de prueba. Se frena si DATABASE_URL es prod.
3. `bash qa/dev-qa.sh` — app en localhost:3000 contra el branch, con Spotify, mails, IA, Replicate,
   Blob y webhooks apagados.
4. Cada agente maneja su navegador con `npx tsx qa/navegar.ts <persona> '<acciones>'`
   (ver el encabezado del archivo). Escribe sus hallazgos en `qa/salida/<persona>/hallazgos.md`.
5. Se consolida en un solo reporte (ver Deduplicar).
6. Al terminar: `npx neonctl branches delete qa-agentes --project-id aged-art-92659338`.

## Las personas
| Persona | Cuenta | Dispositivo |
|---|---|---|
| `duena` — Pinky, dueña y barbera | pinky@a51barber.com | compu |
| `barbero` — Nico, barbero nuevo | qa-barbero@a51.test | celular |
| `mostrador` — alguien atendiendo el mostrador (no hay rol propio: usa la cuenta de barbero) | qa-barbero@a51.test | compu |
| `cliente` — cliente nuevo que llega por un link de WhatsApp | sin cuenta | celular |
| `marciano` — Tomás, socio Marciano que necesita mover o cancelar su turno | qa-marciano@a51.test | celular |

## Formato de cada hallazgo
```
### [persona-NN] Título corto en castellano
- Tipo: ROTO | CONFUNDE | FALTA
- Severidad: S1 no pude terminar la tarea · S2 la terminé con esfuerzo, o el número/dato está mal · S3 detalle
- Dónde: /ruta (botón o sección)
- Pasos: 1… 2… 3…
- Esperaba: …
- Pasó: …
- Evidencia: qa/salida/<persona>/NNN.png · error de consola/red si hubo
- En mis palabras: "…" (lo que pensaría la persona)
```

## Deduplicar
- Se agrupa por ruta + elemento + síntoma. La misma causa vista por varias personas es UN hallazgo
  con "Lo vieron: …"; cuantas más personas, más prioridad.
- Se cruza con "Known bugs / Functional gaps" del CLAUDE.md → se marca "ya conocido".
- Cada S1 se reproduce a mano antes de entrar al reporte final.
