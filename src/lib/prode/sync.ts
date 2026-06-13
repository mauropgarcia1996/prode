import "@tanstack/react-start/server-only";
import { eq } from "drizzle-orm";

import { env } from "#/env/server";
import { db } from "#/lib/db";
import { matches, syncMeta } from "#/lib/db/schema";
import { fetchCompetitionMatches } from "#/lib/football-data";
import type { SyncResult } from "#/lib/prode/types";

async function ensureSyncMetaRow() {
  await db
    .insert(syncMeta)
    .values({ id: 1 })
    .onConflictDoNothing({ target: syncMeta.id });
}

async function runMatchSync(lastSyncAt: Date | null): Promise<SyncResult> {
  await db
    .update(syncMeta)
    .set({ syncing: true, lastSyncError: null })
    .where(eq(syncMeta.id, 1));

  try {
    const normalizedMatches = await fetchCompetitionMatches(
      env.FOOTBALL_DATA_API_KEY,
      env.FOOTBALL_DATA_COMPETITION,
      env.FOOTBALL_DATA_SEASON,
    );

    for (const match of normalizedMatches) {
      const existing = await db
        .select({ manualOverride: matches.manualOverride })
        .from(matches)
        .where(eq(matches.externalId, match.externalId))
        .limit(1);

      if (existing[0]?.manualOverride) {
        await db
          .update(matches)
          .set({
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeCrest: match.homeCrest,
            awayCrest: match.awayCrest,
            kickoffAt: match.kickoffAt,
            status: match.status,
            stage: match.stage,
            groupName: match.groupName,
            updatedAt: new Date(),
          })
          .where(eq(matches.externalId, match.externalId));
        continue;
      }

      await db
        .insert(matches)
        .values({
          externalId: match.externalId,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeCrest: match.homeCrest,
          awayCrest: match.awayCrest,
          kickoffAt: match.kickoffAt,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status,
          stage: match.stage,
          groupName: match.groupName,
          manualOverride: false,
        })
        .onConflictDoUpdate({
          target: matches.externalId,
          set: {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            homeCrest: match.homeCrest,
            awayCrest: match.awayCrest,
            kickoffAt: match.kickoffAt,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            status: match.status,
            stage: match.stage,
            groupName: match.groupName,
            updatedAt: new Date(),
          },
        });
    }

    const syncedAt = new Date();
    await db
      .update(syncMeta)
      .set({
        syncing: false,
        lastSyncAt: syncedAt,
        lastSyncError: null,
        updatedAt: syncedAt,
      })
      .where(eq(syncMeta.id, 1));

    return {
      synced: true,
      stale: false,
      error: null,
      lastSyncAt: syncedAt.toISOString(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error de sincronización";
    await db
      .update(syncMeta)
      .set({
        syncing: false,
        lastSyncError: message,
        updatedAt: new Date(),
      })
      .where(eq(syncMeta.id, 1));

    return {
      synced: false,
      stale: true,
      error: message,
      lastSyncAt: lastSyncAt?.toISOString() ?? null,
    };
  }
}

export async function syncMatchesIfNeeded(): Promise<SyncResult> {
  await ensureSyncMetaRow();

  const [meta] = await db.select().from(syncMeta).where(eq(syncMeta.id, 1)).limit(1);

  const lastSyncAt = meta?.lastSyncAt ?? null;
  const now = Date.now();
  const isStale =
    !lastSyncAt || now - lastSyncAt.getTime() >= env.SYNC_DEBOUNCE_MS;

  if (!isStale) {
    return {
      synced: false,
      stale: false,
      error: meta?.lastSyncError ?? null,
      lastSyncAt: lastSyncAt?.toISOString() ?? null,
    };
  }

  if (meta?.syncing) {
    return {
      synced: false,
      stale: true,
      error: meta.lastSyncError,
      lastSyncAt: lastSyncAt?.toISOString() ?? null,
    };
  }

  return runMatchSync(lastSyncAt);
}

export async function forceSyncMatches(): Promise<SyncResult> {
  await ensureSyncMetaRow();

  const [meta] = await db.select().from(syncMeta).where(eq(syncMeta.id, 1)).limit(1);
  const lastSyncAt = meta?.lastSyncAt ?? null;

  if (meta?.syncing) {
    await waitForSyncIfInProgress();
    const [updated] = await db.select().from(syncMeta).where(eq(syncMeta.id, 1)).limit(1);
    return {
      synced: false,
      stale: false,
      error: updated?.lastSyncError ?? null,
      lastSyncAt: updated?.lastSyncAt?.toISOString() ?? null,
    };
  }

  return runMatchSync(lastSyncAt);
}

export async function getSyncMeta() {
  await ensureSyncMetaRow();
  const [meta] = await db.select().from(syncMeta).where(eq(syncMeta.id, 1)).limit(1);
  return meta ?? null;
}

export async function waitForSyncIfInProgress(maxWaitMs = 5000) {
  const started = Date.now();

  while (Date.now() - started < maxWaitMs) {
    const [meta] = await db.select().from(syncMeta).where(eq(syncMeta.id, 1)).limit(1);
    if (!meta?.syncing) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}
