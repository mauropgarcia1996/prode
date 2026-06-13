import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";

import { authMiddleware } from "#/lib/auth/middleware";

const predictionInputSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
});

const adminOverrideSchema = z.object({
  matchId: z.number().int().positive(),
  homeScore: z.number().int().min(0).max(20),
  awayScore: z.number().int().min(0).max(20),
});

export const $getAppContext = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getAppContext } = await import("#/lib/prode/service.server");
    return getAppContext(context.user.email);
  });

export const $syncAndLoadMatches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { syncAndLoadMatches } = await import("#/lib/prode/service.server");
    return syncAndLoadMatches(context.user.id);
  });

export const $savePrediction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(predictionInputSchema)
  .handler(async ({ context, data }) => {
    const { savePrediction } = await import("#/lib/prode/service.server");
    return savePrediction(context.user.id, data);
  });

export const $getLeaderboard = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const { getLeaderboard } = await import("#/lib/prode/service.server");
    return getLeaderboard();
  });

export const $getProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getProfile } = await import("#/lib/prode/service.server");
    return getProfile(context.user.id);
  });

export const $getAdminMatches = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { getAdminMatches, requireAdmin } = await import("#/lib/prode/service.server");
    await requireAdmin(context.user.email);
    return getAdminMatches();
  });

export const $overrideMatchScore = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(adminOverrideSchema)
  .handler(async ({ context, data }) => {
    const { overrideMatchScore, requireAdmin } = await import("#/lib/prode/service.server");
    await requireAdmin(context.user.email);
    return overrideMatchScore(data);
  });
