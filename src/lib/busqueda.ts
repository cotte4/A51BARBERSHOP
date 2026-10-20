import { sql, type AnyColumn, type SQL } from "drizzle-orm";

// Busca por nombre sin importar mayúsculas ni tildes: "martin" encuentra a "Martín".
// Se usa translate() y no la extensión unaccent para no depender de que esté instalada en Neon.
const CON_TILDE = "áàäâéèëêíìïîóòöôúùüûñç";
const SIN_TILDE = "aaaaeeeeiiiioooouuuunc";

export function sinTildes(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function nombreContiene(columna: AnyColumn, busqueda: string): SQL {
  return sql`translate(lower(${columna}), ${CON_TILDE}, ${SIN_TILDE}) like ${`%${sinTildes(busqueda.trim())}%`}`;
}
