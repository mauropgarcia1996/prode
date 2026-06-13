import { createFileRoute } from "@tanstack/react-router";

import { env } from "#/env/server";
import { syncMatchesIfNeeded } from "#/lib/prode/sync";

export const Route = createFileRoute("/api/cron/sync")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
          return new Response("Unauthorized", { status: 401 });
        }

        const result = await syncMatchesIfNeeded();

        return Response.json({
          ok: true,
          synced: result.synced,
          error: result.error,
          competition: env.FOOTBALL_DATA_COMPETITION,
        });
      },
    },
  },
});
