import type { Config } from "drizzle-kit";

import { loadLocalEnv } from "./scripts/load-local-env";

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Add it to .env.local before running drizzle.");
}

export default {
  out: "./drizzle",
  schema: "./src/lib/db/schema/index.ts",
  breakpoints: true,
  verbose: true,
  strict: true,
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: databaseUrl,
  },
} satisfies Config;
