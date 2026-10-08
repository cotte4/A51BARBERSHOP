# Escudos de los equipos del torneo

Escudos que muestra la tele del torneo (`/torneo/pantalla`) y el cuadro público (`/torneo`).
El catálogo de clubes que se pueden elegir es `CATALOGO_CLUBES` en `src/lib/torneo-escudos.ts` (24 clubes, uno por archivo): para sumar un club hay que agregar el PNG acá y la fila al catálogo. El test `src/tests/integration/torneo-escudos.test.ts` verifica que cada club del catálogo tenga su archivo.

**Son marcas registradas de sus clubes.** Se usan sin fines de lucro, solo para identificar el equipo de cada jugador en un torneo local de EA FC en la barbería. No son de A51 ni implican relación con los clubes.

## Formato

PNG de 512x512, fondo transparente, el escudo recortado al borde y centrado, rasterizado con `sharp` desde el SVG a ~2000 px y achicado (lanczos3).

**Tamaño óptico parejo** (desde 2026-10-08): con el mismo margen para todos, un escudo redondo y lleno (Bayern, Chelsea) se veía mucho más grande que uno alto y angosto (Tottenham, Liverpool). Ahora cada escudo se escala para que la media geométrica de su caja, `sqrt(ancho × alto)`, sea 400 px, con tope de 461 px en el lado mayor (5 % de margen mínimo). Resultado: los redondos miden 400x400 (~11 % de margen) y los altos llegan a 461 de alto. El escudo genérico (`src/components/torneo/Escudo.tsx`) usa el mismo 11 %.

Para rehacer uno: bajar el SVG de la fuente de abajo, recortarlo con `trim()`, calcular `escala = min(461 / max(ancho, alto), 400 / sqrt(ancho × alto))`, redimensionar y componer centrado sobre un lienzo transparente de 512x512.

## Fuentes

Bajados el 2026-10-08 (los 16 primeros se re-normalizaron ese día con el tamaño óptico; los 8 últimos se sumaron con el catálogo). Los de Wikipedia en inglés son archivos de uso legítimo (no libres) que no están en Commons.

| Archivo | Equipo | Fuente |
|---|---|---|
| `real-madrid.png` | Real Madrid | https://en.wikipedia.org/wiki/File:Real_Madrid_CF.svg |
| `barcelona.png` | Barcelona | https://en.wikipedia.org/wiki/File:FC_Barcelona_(crest).svg |
| `atletico-de-madrid.png` | Atlético de Madrid | https://en.wikipedia.org/wiki/File:Atletico_Madrid_Logo_2024.svg |
| `manchester-city.png` | Manchester City | https://en.wikipedia.org/wiki/File:Manchester_City_FC_badge.svg |
| `liverpool.png` | Liverpool | https://en.wikipedia.org/wiki/File:Liverpool_FC.svg |
| `arsenal.png` | Arsenal | https://en.wikipedia.org/wiki/File:Arsenal_FC.svg |
| `chelsea.png` | Chelsea | https://en.wikipedia.org/wiki/File:Chelsea_FC.svg |
| `manchester-united.png` | Manchester United | https://en.wikipedia.org/wiki/File:Manchester_United_FC_crest.svg |
| `tottenham.png` | Tottenham | https://en.wikipedia.org/wiki/File:Tottenham_Hotspur.svg |
| `aston-villa.png` | Aston Villa | https://en.wikipedia.org/wiki/File:Aston_Villa_FC_new_crest.svg |
| `bayern-munich.png` | Bayern Múnich | https://commons.wikimedia.org/wiki/File:FC_Bayern_München_logo_(2024).svg |
| `borussia-dortmund.png` | Borussia Dortmund | https://commons.wikimedia.org/wiki/File:Borussia_Dortmund_logo.svg |
| `inter.png` | Inter | https://commons.wikimedia.org/wiki/File:FC_Internazionale_Milano_2021.svg |
| `inter-miami.png` | Inter Miami | https://en.wikipedia.org/wiki/File:Inter_Miami_CF_logo.svg |
| `roma.png` | Roma | https://en.wikipedia.org/wiki/File:AS_Roma_logo_(2017).svg |
| `psg.png` | PSG | https://en.wikipedia.org/wiki/File:Paris_Saint-Germain_F.C..svg |
| `newcastle.png` | Newcastle | https://en.wikipedia.org/wiki/File:Newcastle_United_Logo.svg |
| `bayer-leverkusen.png` | Bayer Leverkusen | https://en.wikipedia.org/wiki/File:Bayer_04_Leverkusen_logo.svg |
| `milan.png` | Milan | https://commons.wikimedia.org/wiki/File:Logo_of_AC_Milan.svg |
| `juventus.png` | Juventus | https://commons.wikimedia.org/wiki/File:Juventus_FC_-_logo_white_(Italy,_2017).svg (versión blanca oficial: la negra no se ve sobre el fondo oscuro de la tele) |
| `napoli.png` | Napoli | https://commons.wikimedia.org/wiki/File:SSC_Napoli_2025_(white_and_azure).svg (la que usa Wikipedia en inglés) |
| `benfica.png` | Benfica | https://en.wikipedia.org/wiki/File:SL_Benfica_logo.svg |
| `porto.png` | Porto | https://en.wikipedia.org/wiki/File:FC_Porto.svg |
| `ajax.png` | Ajax | https://en.wikipedia.org/wiki/File:Ajax_Amsterdam.svg |
