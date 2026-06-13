import "@tanstack/react-start/server-only";
import { eq, sql } from "drizzle-orm";

import { env } from "#/env/server";
import { db } from "#/lib/db";
import { matches, syncMeta } from "#/lib/db/schema";
import { fetchCompetitionMatches, type NormalizedMatch } from "#/lib/football-data";
import type { SyncResult } from "#/lib/prode/types";

const UPSERT_BATCH_SIZE = 50;

async function ensureSyncMetaRow() {
  await db
    .insert(syncMeta)
    .values({ id: 1 })
    .onConflictDoNothing({ target: syncMeta.id });
}

function toSyncResult(
  meta: typeof syncMeta.$inferSelect | undefined,
  overrides: Partial<SyncResult> = {},
): SyncResult {
  return {
    synced: overrides.synced ?? false,
    stale: overrides.stale ?? false,
    error: overrides.error ?? meta?.lastSyncError ?? null,
    lastSyncAt: overrides.lastSyncAt ?? meta?.lastSyncAt?.toISOString() ?? null,
  };
}

async function upsertRegularMatches(batch: NormalizedMatch[]) {
  if (batch.length === 0) return;

  await db
    .insert(matches)
    .values(
      batch.map((match) => ({
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
      })),
    )
    .onConflictDoUpdate({
      target: matches.externalId,
      set: {
        homeTeam: sql`excluded.home_team`,
        awayTeam: sql`excluded.away_team`,
        homeCrest: sql`excluded.home_crest`,
        awayCrest: sql`excluded.away_crest`,
        kickoffAt: sql`excluded.kickoff_at`,
        homeScore: sql`excluded.home_score`,
        awayScore: sql`excluded.away_score`,
        status: sql`excluded.status`,
        stage: sql`excluded.stage`,
        groupName: sql`excluded.group_name`,
        updatedAt: new Date(),
      },
    });
}

async function updateManualOverrideMatches(batch: NormalizedMatch[]) {
  await Promise.all(
    batch.map((match) =>
      db
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
        .where(eq(matches.externalId, match.externalId)),
    ),
  );
}

async function persistNormalizedMatches(normalizedMatches: NormalizedMatch[]) {
  const manualOverrideRows = await db
    .select({ externalId: matches.externalId })
    .from(matches)
    .where(eq(matches.manualOverride, true));

  const manualOverrideIds = new Set(manualOverrideRows.map((row) => row.externalId));
  const manualMatches: NormalizedMatch[] = [];
  const regularMatches: NormalizedMatch[] = [];

  for (const match of normalizedMatches) {
    if (manualOverrideIds.has(match.externalId)) {
      manualMatches.push(match);
    } else {
      regularMatches.push(match);
    }
  }

  for (let index = 0; index < regularMatches.length; index += UPSERT_BATCH_SIZE) {
    await upsertRegularMatches(regularMatches.slice(index, index + UPSERT_BATCH_SIZE));
  }

  for (let index = 0; index < manualMatches.length; index += UPSERT_BATCH_SIZE) {
    await updateManualOverrideMatches(
      manualMatches.slice(index, index + UPSERT_BATCH_SIZE),
    );
  }
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

    await persistNormalizedMatches(normalizedMatches);

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
    return toSyncResult(meta);
  }

  if (meta?.syncing) {
    return toSyncResult(meta, { stale: true });
  }

  return runMatchSync(lastSyncAt);
}

export async function syncMatchesInBackground() {
  try {
    await syncMatchesIfNeeded();
  } catch {
    // Background sync failures are surfaced via sync_meta on the next read.
  }
}

export async function forceSyncMatches(): Promise<SyncResult> {
  await ensureSyncMetaRow();

  const [meta] = await db.select().from(syncMeta).where(eq(syncMeta.id, 1)).limit(1);
  const lastSyncAt = meta?.lastSyncAt ?? null;

  if (meta?.syncing) {
    await waitForSyncIfInProgress();
    const [updated] = await db.select().from(syncMeta).where(eq(syncMeta.id, 1)).limit(1);
    return toSyncResult(updated);
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

export async function getSyncStatus(): Promise<SyncResult> {
  const meta = await getSyncMeta();
  const lastSyncAt = meta?.lastSyncAt ?? null;
  const isStale =
    !lastSyncAt || Date.now() - lastSyncAt.getTime() >= env.SYNC_DEBOUNCE_MS;

  return toSyncResult(meta, {
    stale: isStale || meta?.syncing === true,
  });
}
