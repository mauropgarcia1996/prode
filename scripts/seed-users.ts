import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { eq } from "drizzle-orm";
import * as z from "zod";

import { auth } from "../src/lib/auth/auth";
import { db } from "../src/lib/db";
import { user } from "../src/lib/db/schema";

const usersSchema = z.array(
  z.object({
    name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
  }),
);

async function main() {
  const raw = readFileSync(resolve("data/users.json"), "utf8");
  const users = usersSchema.parse(JSON.parse(raw));

  for (const entry of users) {
    const [existing] = await db
      .select()
      .from(user)
      .where(eq(user.email, entry.email))
      .limit(1);

    if (existing) {
      console.log(`skip ${entry.email} (already exists)`);
      continue;
    }

    const result = await auth.api.signUpEmail({
      body: {
        name: entry.name,
        email: entry.email,
        password: entry.password,
      },
    });

    if (!result.user) {
      console.error(`failed ${entry.email}`);
      continue;
    }

    console.log(`created ${entry.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
