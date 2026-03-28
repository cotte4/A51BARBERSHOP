import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// Para migraciones, Neon recomienda la URL sin pool (unpooled)
// Si no está disponible, usa la URL normal
const dbUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "DATABASE_URL o DATABASE_URL_UNPOOLED no está configurada. Revisá .env.local"
  );
}

export default {
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
} satisfies Config;
