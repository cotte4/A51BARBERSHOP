import { describe, expect, it } from "vitest";
import { armarCola, filtrarTemas, mezclar, normalizar, ordenarRanking, segundosParaEscucha } from "@/lib/estudio-lista";

const temas = [
  { id: "a", titulo: "BLINGDADO", genero: "Trap" },
  { id: "b", titulo: "Canción del Hangar", genero: "RKT" },
  { id: "c", titulo: "Marcianos", genero: "Trap" },
  { id: "d", titulo: "Sin género", genero: null },
];

/** Azar fijo para que la mezcla sea repetible. */
function azarFijo(valores: number[]) {
  let i = 0;
  return () => valores[i++ % valores.length];
}

describe("buscar y filtrar", () => {
  it("ignora tildes y mayúsculas", () => {
    expect(normalizar("  CanCIÓN ")).toBe("cancion");
    expect(filtrarTemas(temas, "cancion", null).map((t) => t.id)).toEqual(["b"]);
  });

  it("filtra por género y combina con la búsqueda", () => {
    expect(filtrarTemas(temas, "", "Trap").map((t) => t.id)).toEqual(["a", "c"]);
    expect(filtrarTemas(temas, "mar", "Trap").map((t) => t.id)).toEqual(["c"]);
    expect(filtrarTemas(temas, "", null)).toHaveLength(4);
  });
});

describe("cola de reproducción", () => {
  it("sin aleatorio respeta el orden de la lista", () => {
    expect(armarCola(["a", "b", "c"], "b", false)).toEqual(["a", "b", "c"]);
  });

  it("con aleatorio deja el actual primero y mezcla el resto sin repetir", () => {
    const cola = armarCola(["a", "b", "c", "d"], "c", true, azarFijo([0.1, 0.9, 0.5]));
    expect(cola[0]).toBe("c");
    expect([...cola].sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("con aleatorio y nada sonando mezcla todo", () => {
    const cola = armarCola(["a", "b", "c"], null, true, azarFijo([0.3]));
    expect([...cola].sort()).toEqual(["a", "b", "c"]);
  });

  it("mezclar no pierde ni duplica", () => {
    const lista = Array.from({ length: 51 }, (_, i) => i);
    expect([...mezclar(lista)].sort((x, y) => x - y)).toEqual(lista);
  });
});

describe("ranking", () => {
  it("aplica el orden pedido", () => {
    expect(ordenarRanking(["a", "b", "c"], ["c", "a", "b"])).toEqual(["c", "a", "b"]);
  });

  it("un tema subido mientras se ordenaba queda al final, y los borrados se ignoran", () => {
    expect(ordenarRanking(["a", "b", "c", "nuevo"], ["c", "x", "a", "b", "c"])).toEqual(["c", "a", "b", "nuevo"]);
  });
});

describe("cuándo cuenta una escucha", () => {
  it("30 segundos, o la mitad si dura menos de un minuto", () => {
    expect(segundosParaEscucha(180)).toBe(30);
    expect(segundosParaEscucha(40)).toBe(20);
    expect(segundosParaEscucha(0)).toBe(30);
  });
});
