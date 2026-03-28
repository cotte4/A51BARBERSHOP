import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { createAccessControl } from "better-auth/plugins";
import { db } from "@/db";

// Definir los statements y roles del sistema A51 Barber
const ac = createAccessControl({
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
} as const);

// Rol admin: acceso completo
const adminRole = ac.newRole({
  user: ["create", "list", "set-role", "ban", "delete", "set-password", "get", "update"],
  session: ["list", "revoke", "delete"],
});

// Rol barbero: sin permisos de administración de usuarios
const barberoRole = ac.newRole({
  user: [],
  session: [],
});

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    admin({
      defaultRole: "barbero",
      adminRoles: ["admin"],
      roles: {
        admin: adminRole,
        barbero: barberoRole,
      },
    }),
  ],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 días
    },
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
