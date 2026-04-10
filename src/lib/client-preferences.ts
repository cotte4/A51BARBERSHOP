import { z } from "zod";

const emptyToUndefined = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const clientPreferencesSchema = z.object({
  allergies: z.string().max(300).optional().transform(emptyToUndefined),
  productPreferences: z.string().max(300).optional().transform(emptyToUndefined),
  extraNotes: z.string().max(500).optional().transform(emptyToUndefined),
});

export type ClientPreferences = z.infer<typeof clientPreferencesSchema>;

export function normalizeClientPreferences(
  input: Record<string, unknown>
): ClientPreferences | null {
  const parsed = clientPreferencesSchema.parse(input);
  return Object.keys(parsed).length > 0 ? parsed : null;
}
