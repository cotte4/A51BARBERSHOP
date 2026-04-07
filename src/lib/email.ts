const RESEND_API_URL = "https://api.resend.com/emails";

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function isPasswordResetEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

export async function sendMarcianoPasswordResetEmail(input: {
  email: string;
  name: string;
  resetUrl: string;
}) {
  if (!isPasswordResetEmailConfigured()) {
    throw new Error("RESET_EMAIL_NOT_CONFIGURED");
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [input.email],
      subject: "Recupera tu acceso Marciano",
      text: [
        `Hola ${input.name || "Marciano"},`,
        "",
        "Recibimos un pedido para cambiar tu contrasena del portal Marciano.",
        `Abri este link para continuar: ${input.resetUrl}`,
        "",
        "Si no fuiste vos, podes ignorar este email.",
        "",
        "A51 Barber",
      ].join("\n"),
      html: `
        <div style="background:#050708;padding:32px;font-family:Inter,Arial,sans-serif;color:#f5f7f5">
          <div style="max-width:560px;margin:0 auto;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:32px;background:rgba(255,255,255,0.04)">
            <p style="margin:0 0 12px;font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#8cff59">Portal Marciano</p>
            <h1 style="margin:0 0 16px;font-size:32px;line-height:1.05">Recupera tu acceso</h1>
            <p style="margin:0 0 24px;color:#d4d4d8;font-size:15px;line-height:1.6">
              Hola ${escapeHtml(input.name || "Marciano")}. Recibimos un pedido para cambiar tu contrasena del portal.
            </p>
            <a href="${input.resetUrl}" style="display:inline-block;padding:14px 22px;border-radius:18px;background:#8cff59;color:#07130a;text-decoration:none;font-weight:700">
              Crear nueva contrasena
            </a>
            <p style="margin:24px 0 0;color:#a1a1aa;font-size:13px;line-height:1.6">
              Si el boton no funciona, pega este link en tu navegador:<br />
              <span style="word-break:break-word">${input.resetUrl}</span>
            </p>
          </div>
        </div>
      `,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`RESEND_REQUEST_FAILED:${response.status}:${errorBody}`);
  }
}

export function buildMarcianoResetRedirectUrl() {
  return `${getAppUrl()}/marcianos/reset`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
