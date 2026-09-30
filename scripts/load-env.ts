// Se importa primero en los scripts: carga .env.local antes de que `@/db` lea DATABASE_URL.
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
