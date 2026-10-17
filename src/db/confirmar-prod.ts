// Freno para scripts y tests que escriben en la base. Hay una sola base (local = producción),
// así que nada que inserte o borre datos corre sin que alguien lo confirme.
// - En una terminal: pide escribir "si".
// - Sin terminal (CI, Playwright): solo pasa con CONFIRMO_PROD=si.
import { createInterface } from "node:readline/promises";

export async function confirmarEscrituraEnProd(queHace: string): Promise<void> {
  if (process.env.CONFIRMO_PROD === "si") return;

  if (!process.stdin.isTTY) {
    throw new Error(
      `Frenado: "${queHace}" escribe en la base de producción. Para correrlo igual: CONFIRMO_PROD=si`
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const respuesta = await rl.question(
    `\n⚠  ${queHace}\n   Esto escribe en la base de PRODUCCIÓN. Escribí "si" para seguir: `
  );
  rl.close();

  if (respuesta.trim().toLowerCase() !== "si") {
    console.log("Cancelado. No se tocó nada.");
    process.exit(1);
  }
}
