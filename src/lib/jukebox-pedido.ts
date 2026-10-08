// Qué pasó con el último tema que pidió un cliente. Sin DB: lo testea jukebox-pedido.test.ts.

export type EstadoPropuesta = "pending" | "approved" | "rejected" | "played";
export type EstadoCola = "queued" | "playing" | "played" | "skipped";

export type EstadoPedido = "en_revision" | "en_cola" | "sonando" | "ya_sono" | "no_entro";

export type PedidoCliente = {
  videoTitle: string;
  estado: EstadoPedido;
  /** Solo en cola: cuántos temas suenan antes (los de adelante más el que está sonando). */
  lugar: number | null;
};

type FilaCola = { state: EstadoCola; positionHint: number };

export function resolverPedido(
  propuesta: { videoTitle: string; status: EstadoPropuesta },
  item: FilaCola | null,
  activos: FilaCola[],
): PedidoCliente {
  const pedido = (estado: EstadoPedido, lugar: number | null = null): PedidoCliente => ({
    videoTitle: propuesta.videoTitle,
    estado,
    lugar,
  });

  // Si llegó a la cola manda la cola: la propuesta pasa a "played" apenas empieza a sonar.
  if (item) {
    if (item.state === "playing") return pedido("sonando");
    if (item.state === "played") return pedido("ya_sono");
    if (item.state === "skipped") return pedido("no_entro");
    const antes = activos.filter(
      (a) => a.state === "playing" || (a.state === "queued" && a.positionHint < item.positionHint),
    ).length;
    return pedido("en_cola", antes);
  }

  if (propuesta.status === "pending") return pedido("en_revision");
  if (propuesta.status === "rejected") return pedido("no_entro");
  if (propuesta.status === "played") return pedido("ya_sono");
  // Aprobada pero todavía sin fila (el instante entre aprobar y encolar): va al final.
  return pedido("en_cola", activos.filter((a) => a.state === "queued" || a.state === "playing").length);
}
