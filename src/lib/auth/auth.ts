import "@tanstack/react-start/server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth/minimal";
import { tanstackStartCookies } from "better-auth/tanstack-start";

import { env } from "#/env/server";
import { db } from "#/lib/db";
import * as schema from "#/lib/db/schema";

export const auth = betterAuth({
  baseURL: env.VITE_BASE_URL,
  telemetry: {
    enabled: false,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [tanstackStartCookies()],
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  experimental: {
    joins: true,
  },
});
