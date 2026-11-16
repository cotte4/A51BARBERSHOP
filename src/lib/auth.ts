import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { createAccessControl } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendMarcianoPasswordResetEmail } from "@/lib/email";

const privilegedPermissions = {
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
} as const;

// Definir los statements y roles del sistema A51 Barber
const ac = createAccessControl(privilegedPermissions);

// Rol admin: acceso completo
const adminRole = ac.newRole(privilegedPermissions);

// Rol asesor: misma jerarquia operativa que admin, sin convertirse en barbero
const asesorRole = ac.newRole(privilegedPermissions);

// Rol barbero: sin permisos de administración de usuarios
const barberoRole = ac.newRole({
  user: [],
  session: [],
});

// Rol marciano: acceso solo a su propio portal
const marcianoRole = ac.newRole({
  user: [],
  session: [],
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins: [
    "http://localhost:3000",
    process.env.NEXT_PUBLIC_APP_URL ?? "",
  ].filter(Boolean),
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await sendMarcianoPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl: url,
      });
    },
  },
  plugins: [
    admin({
      defaultRole: "barbero",
      adminRoles: ["admin", "asesor"],
      roles: {
        admin: adminRole,
        asesor: asesorRole,
        barbero: barberoRole,
        marciano: marcianoRole,
      },
    }),
  ],
  session: {
    // 90 días sin abrir la app y hay que volver a entrar; cada día que se usa, se estira
    // otros 90 (updateAge). La cookie renovada la reenvía el proxy (src/proxy.ts).
    expiresIn: 60 * 60 * 24 * 90,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      // Corto a propósito: mientras este cache vale, Better Auth no pasa por la renovación.
      // Con 7 días (como estaba) la sesión nunca se estiraba y vencía a los 7 días del login.
      maxAge: 5 * 60,
    },
  },
});

export type Session = typeof auth.$Infer.Session;
