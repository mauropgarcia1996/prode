import { createEnv } from "@t3-oss/env-core";
import * as z from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    VITE_BASE_URL: z.url().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(1),
    FOOTBALL_DATA_API_KEY: z.string().min(1),
    ADMIN_EMAILS: z
      .string()
      .min(1)
      .transform((value) =>
        value
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean),
      ),
    SYNC_DEBOUNCE_MS: z.coerce.number().default(10 * 60 * 1000),
    FOOTBALL_DATA_COMPETITION: z.string().default("WC"),
    FOOTBALL_DATA_SEASON: z.coerce.number().default(2026),
  },
  runtimeEnv: process.env,
});
