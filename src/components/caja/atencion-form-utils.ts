export type ProductoListItem = {
  id: string;
  nombre: string;
  precioVenta: string | null;
  stockActual: number | null;
  esConsumicion: boolean;
};

export type ClientLookupItem = {
  id: string;
  name: string;
  phoneRaw: string | null;
  esMarciano: boolean;
};

export type EditContext = {
  movementCode: string;
  dateLabel: string;
  timeLabel: string;
  barberoLabel: string;
  clientLabel: string;
  servicioLabel: string;
  medioPagoLabel: string;
  serviceAmount: string;
  productsAmount: string;
  totalAmount: string;
};

export type ProductoSeleccionadoState = {
  id: string;
  nombre: string;
  precioLista: number;
  precioUnitario: number;
  stockActual: number;
  cantidad: number;
  esConsumicion: boolean;
  esMarcianoIncluido: boolean;
};

export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

export function getBarberoEmoji(nombre: string): string {
  const normalized = nombre.toLowerCase();
  if (normalized.includes("pinky")) return "P";
  if (normalized.includes("gabo") || normalized.includes("gabote")) return "G";
  return "B";
}

export function getServicioEmoji(nombre: string): string {
  const normalized = nombre.toLowerCase();
  if (normalized.includes("barba") && normalized.includes("corte")) return "CB";
  if (normalized.includes("barba")) return "BA";
  if (normalized.includes("nino") || normalized.includes("ni")) return "NI";
  if (normalized.includes("ceja")) return "CE";
  if (normalized.includes("combo")) return "CO";
  if (normalized.includes("corte")) return "CT";
  return "SV";
}

export function getMedioPagoMeta(nombre: string | null) {
  const normalized = (nombre ?? "").toLowerCase();

  if (normalized.includes("efectivo")) {
    return { emoji: "EF", label: "Efectivo", order: 0 };
  }
  if (normalized.includes("transf")) {
    return { emoji: "TR", label: "Transferencia", order: 1 };
  }
  if (normalized.includes("posnet") || normalized.includes("tarjeta")) {
    return { emoji: "TC", label: "Posnet / Tarjeta", order: 2 };
  }
  if (normalized.includes("mercado") || normalized === "mp") {
    return { emoji: "MP", label: nombre ?? "Mercado Pago", order: 3 };
  }

  return { emoji: "OT", label: nombre ?? "Otro", order: 4 };
}

export function getInitials(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function buildClientLabel(client: ClientLookupItem): string {
  return client.phoneRaw ? `${client.name} - ${client.phoneRaw}` : client.name;
}

export function buildInitialProductos(
  initialProductos:
    | Array<{
        productoId: string;
        cantidad: number;
        precioUnitario: string | number | null;
        esMarcianoIncluido?: boolean;
      }>
    | undefined,
  productosList: ProductoListItem[],
): ProductoSeleccionadoState[] {
  const productosMap = new Map(productosList.map((producto) => [producto.id, producto]));

  return (initialProductos ?? [])
    .map((item) => {
      const producto = productosMap.get(item.productoId);
      if (!producto) return null;

      const precioLista = Number(producto.precioVenta ?? 0);
      const esMarcianoIncluido = Boolean(item.esMarcianoIncluido);

      return {
        id: producto.id,
        nombre: producto.nombre,
        cantidad: Number(item.cantidad ?? 0),
        precioLista,
        precioUnitario: esMarcianoIncluido
          ? 0
          : Number(item.precioUnitario ?? producto.precioVenta ?? 0),
        stockActual: Number(producto.stockActual ?? 0) + Number(item.cantidad ?? 0),
        esConsumicion: producto.esConsumicion,
        esMarcianoIncluido,
      };
    })
    .filter((item): item is ProductoSeleccionadoState => item !== null && item.cantidad > 0);
}
