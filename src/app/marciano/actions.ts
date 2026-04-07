"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { clients, turnos, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { normalizeClientPreferences } from "@/lib/client-preferences";
import { buildMarcianoResetRedirectUrl, isPasswordResetEmailConfigured } from "@/lib/email";
import { getMarcianoTurnoById } from "@/lib/marciano-turnos";
import { normalizeMarcianoEmail, requireMarcianoClient } from "@/lib/marciano-portal";
import { normalizePhone } from "@/lib/phone";
import { PUBLIC_RESERVA_SLUG, normalizeHora, resolvePublicBarberoBySlug } from "@/lib/turnos";
import { createTurnoReserva } from "@/lib/turnos-reserva";

export type MarcianoRegisterState = {
  success?: boolean;
  message?: string;
  fields?: {
    email?: string;
    password?: string;
  };
};

export type MarcianoProfileState = {
  success?: boolean;
  message?: string;
  fieldErrors?: {
    name?: string;
    phoneRaw?: string;
  };
};

export type MarcianoReservaState = {
  message?: string;
  fieldErrors?: {
    slotId?: string;
    serviceId?: string;
  };
};

export type MarcianoPasswordState = {
  success?: boolean;
  message?: string;
  fieldErrors?: {
    email?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
};

const passwordSchema = z
  .string()
  .min(8, "La contrasena debe tener al menos 8 caracteres.")
  .regex(/[a-zA-Z]/, "La contrasena debe incluir al menos una letra.")
  .regex(/[0-9]/, "La contrasena debe incluir al menos un numero.");

const registerSchema = z.object({
  email: z.email("Ingresa un email valido."),
  password: passwordSchema,
});

const marcianoReservaSchema = z.object({
  serviceId: z.string().uuid("Elegi un servicio valido."),
  slotId: z.string().uuid("Elegi un horario disponible."),
  notaCliente: z.string().trim().max(300).optional().or(z.literal("")),
  reprogramarTurnoId: z.string().uuid().optional().or(z.literal("")),
});

const requestPasswordResetSchema = z.object({
  email: z.email("Ingresa un email valido."),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contrasena actual."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu nueva contrasena."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden.",
  });

const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "El token de recuperacion no es valido."),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Confirma tu nueva contrasena."),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contrasenas no coinciden.",
  });

export async function registerMarcianoAction(
  _prevState: MarcianoRegisterState,
  formData: FormData
): Promise<MarcianoRegisterState> {
  const parsed = registerSchema.safeParse({
    email: normalizeMarcianoEmail(formData.get("email")) ?? "",
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      fields: {
        email: parsed.error.flatten().fieldErrors.email?.[0],
        password: parsed.error.flatten().fieldErrors.password?.[0],
      },
    };
  }

  const { email, password } = parsed.data;

  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      userId: clients.userId,
      esMarciano: clients.esMarciano,
      archivedAt: clients.archivedAt,
    })
    .from(clients)
    .where(eq(clients.email, email))
    .limit(1);

  if (!client || !client.esMarciano || client.archivedAt) {
    return {
      message:
        "No encontramos una membresia Marciano activa con ese email. Pedile a A51 que valide tu acceso.",
    };
  }

  if (client.userId) {
    return {
      message: "Tu acceso ya esta creado. Ingresa con tu email y contrasena desde el login.",
    };
  }

  const [existingUser] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existingUser) {
    return {
      message:
        "Ese email ya tiene una cuenta creada. Escribinos para vincularla correctamente antes de seguir.",
    };
  }

  const created = await auth.api.createUser({
    body: {
      email,
      password,
      name: client.name,
      role: "marciano",
    },
  });

  await db
    .update(clients)
    .set({
      userId: created.user.id,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${client.id}`);

  return {
    success: true,
    message: "Cuenta lista. Te estamos llevando al portal Marciano...",
  };
}

export async function updateMarcianoProfileAction(
  _prevState: MarcianoProfileState,
  formData: FormData
): Promise<MarcianoProfileState> {
  const { client } = await requireMarcianoClient();

  const name = String(formData.get("name") ?? "").trim();
  const phoneRaw = String(formData.get("phoneRaw") ?? "").trim() || null;
  const phoneNormalized = normalizePhone(phoneRaw);

  if (!name) {
    return {
      fieldErrors: {
        name: "Tu nombre es obligatorio.",
      },
    };
  }

  if (phoneRaw && !phoneNormalized) {
    return {
      fieldErrors: {
        phoneRaw: "Ingresa un telefono valido.",
      },
    };
  }

  const preferences = normalizeClientPreferences({
    allergies: formData.get("allergies"),
    productPreferences: formData.get("productPreferences"),
    extraNotes: formData.get("extraNotes"),
  });

  await db
    .update(clients)
    .set({
      name,
      phoneRaw,
      phoneNormalized,
      preferences,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  revalidatePath("/marciano/perfil");
  revalidatePath("/marciano/turnos");
  revalidatePath("/marciano/turnos/nuevo");

  return {
    success: true,
    message: "Perfil actualizado.",
  };
}

export async function createMarcianoTurnoAction(
  _prevState: MarcianoReservaState,
  formData: FormData
): Promise<MarcianoReservaState> {
  const { client } = await requireMarcianoClient();

  if (!client.phoneRaw) {
    return {
      message: "Completa tu telefono desde tu perfil antes de reservar.",
    };
  }

  const phoneNormalized = normalizePhone(client.phoneRaw);
  if (!phoneNormalized) {
    return {
      message: "Tu telefono actual no es valido. Actualizalo en tu perfil antes de reservar.",
    };
  }

  const parsed = marcianoReservaSchema.safeParse({
    serviceId: String(formData.get("serviceId") ?? ""),
    slotId: String(formData.get("slotId") ?? ""),
    notaCliente: String(formData.get("notaCliente") ?? ""),
    reprogramarTurnoId: String(formData.get("reprogramarTurnoId") ?? ""),
  });

  if (!parsed.success) {
    return {
      fieldErrors: {
        serviceId: parsed.error.flatten().fieldErrors.serviceId?.[0],
        slotId: parsed.error.flatten().fieldErrors.slotId?.[0],
      },
    };
  }

  const reprogramarTurnoId = parsed.data.reprogramarTurnoId || null;
  const turnoOriginal = reprogramarTurnoId
    ? await getMarcianoTurnoById(client.id, reprogramarTurnoId)
    : null;

  if (reprogramarTurnoId && !turnoOriginal) {
    return {
      message: "No encontramos el turno que queres reprogramar.",
    };
  }

  if (turnoOriginal && !turnoOriginal.canManage) {
    return {
      message: turnoOriginal.manageMessage ?? "Ese turno ya no admite cambios desde el portal.",
    };
  }

  const barbero = await resolvePublicBarberoBySlug(PUBLIC_RESERVA_SLUG);
  if (!barbero) {
    return {
      message: "No pudimos resolver la agenda disponible de A51.",
    };
  }

  const result = await createTurnoReserva({
    barberoId: barbero.id,
    slotId: parsed.data.slotId,
    serviceId: parsed.data.serviceId,
    clienteNombre: client.name,
    clienteTelefonoRaw: client.phoneRaw,
    notaCliente: parsed.data.notaCliente || null,
    clientContext: {
      clientId: client.id,
      esMarciano: true,
      phoneNormalized,
    },
  });

  if (!result.ok) {
    return {
      message: result.message,
    };
  }

  if (turnoOriginal) {
    await db
      .update(turnos)
      .set({
        estado: "cancelado",
        motivoCancelacion: `Reprogramado por Marciano hacia ${result.fecha} ${normalizeHora(result.horaInicio)}`,
        updatedAt: new Date(),
      })
      .where(eq(turnos.id, turnoOriginal.id));
  }

  revalidatePath("/marciano");
  revalidatePath("/marciano/turnos");
  revalidatePath("/marciano/turnos/nuevo");
  revalidatePath("/turnos");
  revalidatePath("/turnos/disponibilidad");
  revalidatePath("/hoy");
  revalidatePath("/reservar/pinky");

  redirect(`/marciano/turnos?estado=${turnoOriginal ? "reprogramado" : "reservado"}`);
}

export async function cancelMarcianoTurnoAction(
  turnoId: string,
  _prevState: MarcianoReservaState
): Promise<MarcianoReservaState> {
  const { client } = await requireMarcianoClient();
  const turno = await getMarcianoTurnoById(client.id, turnoId);

  if (!turno) {
    return {
      message: "No encontramos ese turno en tu portal.",
    };
  }

  if (!turno.canManage) {
    return {
      message: turno.manageMessage ?? "Ese turno ya no admite cambios desde el portal.",
    };
  }

  await db
    .update(turnos)
    .set({
      estado: "cancelado",
      motivoCancelacion: "Cancelado por Marciano desde el portal",
      updatedAt: new Date(),
    })
    .where(eq(turnos.id, turno.id));

  revalidatePath("/marciano");
  revalidatePath("/marciano/turnos");
  revalidatePath("/turnos");
  revalidatePath("/turnos/disponibilidad");
  revalidatePath("/hoy");
  revalidatePath("/reservar/pinky");

  redirect("/marciano/turnos?estado=cancelado");
}

export async function requestMarcianoPasswordResetAction(
  _prevState: MarcianoPasswordState,
  formData: FormData
): Promise<MarcianoPasswordState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: normalizeMarcianoEmail(formData.get("email")) ?? "",
  });

  if (!parsed.success) {
    return {
      fieldErrors: {
        email: parsed.error.flatten().fieldErrors.email?.[0],
      },
    };
  }

  if (!isPasswordResetEmailConfigured()) {
    return {
      message:
        "La recuperacion por email todavia no esta configurada en este entorno. Cuando agreguemos Resend, queda operativa sin tocar este flujo.",
    };
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email: parsed.data.email,
        redirectTo: buildMarcianoResetRedirectUrl(),
      },
    });
  } catch (error) {
    console.error("Error pidiendo reset de contrasena Marciano:", error);
    return {
      message: "No pudimos enviar el email de recuperacion. Intenta de nuevo.",
    };
  }

  return {
    success: true,
    message:
      "Si ese email existe en el portal Marciano, te mandamos un link para crear una nueva contrasena.",
  };
}

export async function changeMarcianoPasswordAction(
  _prevState: MarcianoPasswordState,
  formData: FormData
): Promise<MarcianoPasswordState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: String(formData.get("currentPassword") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      fieldErrors: {
        currentPassword: parsed.error.flatten().fieldErrors.currentPassword?.[0],
        newPassword: parsed.error.flatten().fieldErrors.newPassword?.[0],
        confirmPassword: parsed.error.flatten().fieldErrors.confirmPassword?.[0],
      },
    };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
  } catch (error) {
    return {
      message: getAuthErrorMessage(error, "No pudimos cambiar tu contrasena."),
    };
  }

  return {
    success: true,
    message: "Contrasena actualizada.",
  };
}

export async function resetMarcianoPasswordAction(
  _prevState: MarcianoPasswordState,
  formData: FormData
): Promise<MarcianoPasswordState> {
  const parsed = resetPasswordSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    newPassword: String(formData.get("newPassword") ?? ""),
    confirmPassword: String(formData.get("confirmPassword") ?? ""),
  });

  if (!parsed.success) {
    return {
      fieldErrors: {
        newPassword: parsed.error.flatten().fieldErrors.newPassword?.[0],
        confirmPassword: parsed.error.flatten().fieldErrors.confirmPassword?.[0],
      },
      message: parsed.error.flatten().fieldErrors.token?.[0],
    };
  }

  try {
    await auth.api.resetPassword({
      body: {
        token: parsed.data.token,
        newPassword: parsed.data.newPassword,
      },
    });
  } catch (error) {
    return {
      message: getAuthErrorMessage(error, "No pudimos guardar tu nueva contrasena."),
    };
  }

  return {
    success: true,
    message: "Contrasena actualizada. Ya podes volver a entrar al portal Marciano.",
  };
}

function getAuthErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : "";

  if (message.includes("INVALID_PASSWORD")) {
    return "La contrasena actual no coincide.";
  }
  if (message.includes("INVALID_TOKEN")) {
    return "El link de recuperacion ya no es valido o vencio.";
  }
  if (message.includes("PASSWORD_TOO_SHORT")) {
    return "La nueva contrasena es demasiado corta.";
  }
  if (message.includes("PASSWORD_TOO_LONG")) {
    return "La nueva contrasena es demasiado larga.";
  }

  return fallback;
}
