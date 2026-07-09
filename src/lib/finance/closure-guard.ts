import { hasCajaCerrada } from "@/lib/dal/caja";

export async function assertCajaAbiertaOrThrow(fecha: string): Promise<void> {
  if (await hasCajaCerrada(fecha)) {
    throw new Error("La caja del dia ya fue cerrada.");
  }
}
