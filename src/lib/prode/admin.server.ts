import "@tanstack/react-start/server-only";

import { env } from "#/env/server";

export function isAdminEmail(email: string) {
  return env.ADMIN_EMAILS.includes(email.toLowerCase());
}
