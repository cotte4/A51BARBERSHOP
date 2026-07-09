import Anthropic from "@anthropic-ai/sdk";

export const INTERNAL_SUPPORT_ALLOWED_ROLES = ["admin", "asesor", "barbero"] as const;

const INTERNAL_SUPPORT_ALLOWED_PREFIXES = [
  "/hoy",
  "/caja",
  "/clientes",
  "/turnos",
  "/musica",
  "/dashboard",
  "/negocio",
  "/configuracion",
  "/liquidaciones",
  "/inventario",
  "/repago",
  "/mi-resultado",
  "/gastos-rapidos",
  "/finanzas",
] as const;

export function isInternalSupportRole(role: string | undefined): boolean {
  return INTERNAL_SUPPORT_ALLOWED_ROLES.some((allowedRole) => allowedRole === role);
}

export function isInternalSupportPath(pathname: string): boolean {
  return INTERNAL_SUPPORT_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export type SupportIntent =
  | "how_to_use"
  | "bug_report"
  | "feature_request"
  | "implementation_idea"
  | "not_sure";

type CuratedRouteGuide = {
  routePrefix: string;
  title: string;
  bullets: string[];
  deepLinks: Array<{ label: string; href: string }>;
};

const CURATED_GUIDES: CuratedRouteGuide[] = [
  {
    routePrefix: "/caja",
    title: "Caja operativa",
    bullets: [
      "Registrar atenciones del dia, editar y cerrar (solo admin).",
      "Ventas de producto desde Vender, con medio de pago obligatorio.",
      "Si ves bloqueo por cierre, esa fecha ya no admite mutaciones.",
    ],
    deepLinks: [
      { label: "Caja", href: "/caja" },
      { label: "Nueva atencion", href: "/caja/nueva" },
      { label: "Vender producto", href: "/caja/vender" },
    ],
  },
  {
    routePrefix: "/turnos",
    title: "Turnos",
    bullets: [
      "Confirmar o cancelar cambia estado y registra eventos de notificacion.",
      "Cobrar y completar impacta caja con reglas financieras unificadas.",
      "Disponibilidad y slots se gestionan por barbero y fecha.",
    ],
    deepLinks: [
      { label: "Turnos", href: "/turnos" },
      { label: "Disponibilidad", href: "/turnos/disponibilidad" },
    ],
  },
  {
    routePrefix: "/clientes",
    title: "Clientes",
    bullets: [
      "Busqueda y perfil por cliente con historial reciente.",
      "Pipeline de retencion para seguimiento (pendiente/contactado/reagendado).",
      "Beneficios Marciano se actualizan automaticamente por atencion.",
    ],
    deepLinks: [
      { label: "Clientes", href: "/clientes" },
      { label: "Nuevo cliente", href: "/clientes/nuevo" },
    ],
  },
  {
    routePrefix: "/negocio",
    title: "Negocio",
    bullets: [
      "Hub owner con soporte, go-live, activos y configuracion clave.",
      "Mutaciones sensibles protegidas por rol owner/admin.",
      "Soporte centraliza bugs y propuestas internas.",
    ],
    deepLinks: [
      { label: "Negocio", href: "/negocio" },
      { label: "Soporte", href: "/negocio/soporte" },
      { label: "Go-live", href: "/negocio/go-live" },
    ],
  },
];

function classifySupportIntent(message: string): SupportIntent {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return "not_sure";
  if (
    normalized.includes("bug") ||
    normalized.includes("fallo") ||
    normalized.includes("error") ||
    normalized.includes("no funciono")
  ) {
    return "bug_report";
  }
  if (
    normalized.includes("feature") ||
    normalized.includes("falta") ||
    normalized.includes("me gustaria") ||
    normalized.includes("deberia tener")
  ) {
    return "feature_request";
  }
  if (
    normalized.includes("implement") ||
    normalized.includes("tecnico") ||
    normalized.includes("arquitectura") ||
    normalized.includes("solucion")
  ) {
    return "implementation_idea";
  }
  if (
    normalized.includes("como") ||
    normalized.includes("donde") ||
    normalized.includes("usar") ||
    normalized.includes("paso a paso")
  ) {
    return "how_to_use";
  }
  return "not_sure";
}

function guidanceForPath(pathname: string): CuratedRouteGuide | null {
  return (
    CURATED_GUIDES.find(
      (guide) => pathname === guide.routePrefix || pathname.startsWith(`${guide.routePrefix}/`)
    ) ?? null
  );
}

function intentPrompt(intent: SupportIntent): string {
  if (intent === "bug_report") {
    return "Perfecto. Te paso el formulario de bug para no perder tiempo y dejar contexto completo.";
  }
  if (intent === "feature_request") {
    return "Buena idea. Te paso el formulario de propuesta para convertirla en item accionable.";
  }
  if (intent === "implementation_idea") {
    return "Excelente. Te paso un formulario tecnico para capturar implementacion y trade-offs.";
  }
  if (intent === "how_to_use") {
    return "Te guio paso a paso con lo que ya existe en esta pantalla.";
  }
  return "Decime si queres ayuda de uso, reportar bug o proponer mejora y te abro el formulario correcto.";
}

export type SupportFormType = "bug_report" | "feature_request" | "implementation_idea" | null;

function formTypeForIntent(intent: SupportIntent): SupportFormType {
  if (intent === "bug_report") return "bug_report";
  if (intent === "feature_request") return "feature_request";
  if (intent === "implementation_idea") return "implementation_idea";
  return null;
}

export function buildInternalSupportReply(input: {
  pathname: string;
  role: string;
  message: string;
}) {
  const intent = classifySupportIntent(input.message);
  const curatedGuide = guidanceForPath(input.pathname);
  const fallbackBullets = [
    "Puedo guiarte por pantalla actual o abrir formulario de bug/propuesta.",
    "Si algo fallo, escribi 'no funciono'.",
    "Si queres pedir mejora, escribi 'feature' o 'idea de implementacion'.",
  ];

  return {
    intent,
    mode: intent === "how_to_use" ? "guidance" : "intake",
    formType: formTypeForIntent(intent),
    reply: intentPrompt(intent),
    bullets: curatedGuide?.bullets ?? fallbackBullets,
    deepLinks: curatedGuide?.deepLinks ?? [],
    contextCard: curatedGuide
      ? {
          title: curatedGuide.title,
          routePrefix: curatedGuide.routePrefix,
        }
      : null,
  };
}

const INTERNAL_SUPPORT_MODEL =
  process.env.INTERNAL_SUPPORT_MODEL?.trim() || "claude-haiku-4-5-20251001";
const INTERNAL_SUPPORT_DISABLE_LLM = process.env.INTERNAL_SUPPORT_DISABLE_LLM === "1";

/** User-facing label for the support widget (Haiku vs free fallback). */
export function resolveCopilotModeLabel(model: string | null, usedFallback: boolean): string {
  if (usedFallback || !model) return "Gratis";
  if (model.toLowerCase().includes("haiku")) return "Haiku";
  return model;
}

export async function buildInternalSupportReplyWithModel(input: {
  pathname: string;
  role: string;
  message: string;
}) {
  const base = buildInternalSupportReply(input);
  const curatedGuide = guidanceForPath(input.pathname);
  if (INTERNAL_SUPPORT_DISABLE_LLM) {
    return {
      ...base,
      model: null,
      usedFallback: true,
      copilotModeLabel: resolveCopilotModeLabel(null, true),
    };
  }
  const anthropic = new Anthropic();

  const prompt = [
    "Sos un copiloto interno de A51 Barber para usuarios barbero/admin.",
    "Tu objetivo es ahorrar tiempo operativo y enrutar a formularios cuando corresponde.",
    "Devolve SOLO JSON valido con schema:",
    `{
  "intent": "how_to_use|bug_report|feature_request|implementation_idea|not_sure",
  "reply": "string corto",
  "bullets": ["max 4 items"],
  "formType": "bug_report|feature_request|implementation_idea|null"
}`,
    "No incluyas markdown ni texto extra.",
    `Ruta actual: ${input.pathname}`,
    `Rol: ${input.role}`,
    `Mensaje: ${input.message}`,
    `Contexto curado: ${JSON.stringify(curatedGuide ?? null)}`,
  ].join("\n");

  try {
    const response = await anthropic.messages.create({
      model: INTERNAL_SUPPORT_MODEL,
      max_tokens: 280,
      messages: [{ role: "user", content: prompt }],
    });
    const first = response.content[0];
    const raw = first.type === "text" ? first.text.trim() : "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as {
      intent?: SupportIntent;
      reply?: string;
      bullets?: string[];
      formType?: SupportFormType;
    };

    const intent = parsed.intent ?? base.intent;
    const safeBullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((item) => typeof item === "string").slice(0, 4)
      : base.bullets;

    return {
      ...base,
      intent,
      reply: parsed.reply?.trim() || base.reply,
      bullets: safeBullets,
      formType: parsed.formType ?? formTypeForIntent(intent),
      model: INTERNAL_SUPPORT_MODEL,
      usedFallback: false,
      copilotModeLabel: resolveCopilotModeLabel(INTERNAL_SUPPORT_MODEL, false),
    };
  } catch {
    return {
      ...base,
      model: null,
      usedFallback: true,
      copilotModeLabel: resolveCopilotModeLabel(null, true),
    };
  }
}

export function buildLegacyGuidanceForPath(pathname: string): string[] {
  if (pathname.startsWith("/caja")) {
    return [
      "En caja podes registrar atenciones nuevas, editar las del dia y cerrar solo si sos admin.",
      "Si ves bloqueo por cierre, esa fecha ya esta cerrada y no admite nuevas mutaciones.",
      "Para ventas de producto, usa Vender y verifica medio de pago antes de confirmar.",
    ];
  }

  if (pathname.startsWith("/turnos")) {
    return [
      "En turnos confirmas, cancelas o completas segun estado del turno.",
      "Cobrar y completar crea la atencion en caja con las mismas reglas de comision.",
      "Si un turno falla, revisa primero estado, servicio y medio de pago.",
    ];
  }

  if (pathname.startsWith("/clientes")) {
    return [
      "En clientes podes actualizar perfil, historial y señales de retencion.",
      "Si un cliente es Marciano, el uso de beneficios se actualiza con la atencion.",
      "Para dudas de un cliente puntual, primero abrilo desde la lista y despues accede al detalle.",
    ];
  }

  if (pathname.startsWith("/hoy")) {
    return [
      "Hoy es tu panel operativo: prioridades, pendientes y acceso rapido a caja/turnos.",
      "Si no ves una accion, puede estar oculta por rol o estado de caja/turno.",
      "Para resolver rapido: primero pendiente de turnos, despues caja, luego clientes.",
    ];
  }

  if (pathname.startsWith("/negocio") || pathname.startsWith("/dashboard")) {
    return [
      "Estas en vista de negocio. Las mutaciones sensibles son owner-only.",
      "Si algo no coincide en numeros, valida fecha, cierre y filtros del modulo.",
      "Ante duda de liquidaciones, revisar primero cierres del dia y comisiones aplicadas.",
    ];
  }

  return [
    "Puedo ayudarte con pasos de uso segun tu pantalla actual.",
    "Decime que intentaste hacer y te doy un paso a paso corto.",
    "Si algo fallo, escribi 'no funciono' y el sistema te pedira un reporte estructurado.",
  ];
}
