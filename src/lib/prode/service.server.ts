import "@tanstack/react-start/server-only";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "#/lib/db";
import { matches, predictions, user } from "#/lib/db/schema";
import { isAdminEmail } from "#/lib/prode/admin.server";
import { assignRanks, calcPoints, isMatchLocked } from "#/lib/prode/scoring";
import { syncMatchesIfNeeded, waitForSyncIfInProgress } from "#/lib/prode/sync";
import type {
  LeaderboardEntry,
  MatchWithPrediction,
  ProfileStats,
} from "#/lib/prode/types";

export async function getAppContext(email: string) {
  return {
    isAdmin: isAdminEmail(email),
  };
}

export async function syncAndLoadMatches(userId: string) {
  await waitForSyncIfInProgress();
  const sync = await syncMatchesIfNeeded();

  const allMatches = await db.select().from(matches).orderBy(asc(matches.kickoffAt));
  const userPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, userId));

  const predictionMap = new Map(
    userPredictions.map((prediction) => [prediction.matchId, prediction]),
  );

  const now = new Date();
  const mappedMatches: MatchWithPrediction[] = allMatches.map((match) => {
    const prediction = predictionMap.get(match.externalId) ?? null;
    const locked = isMatchLocked(match.kickoffAt, match.status, now);
    const points =
      match.status === "FINISHED" && prediction
        ? calcPoints(
            prediction.homeScore,
            prediction.awayScore,
            match.homeScore,
            match.awayScore,
          )
        : null;

    return {
      externalId: match.externalId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeCrest: match.homeCrest,
      awayCrest: match.awayCrest,
      kickoffAt: match.kickoffAt.toISOString(),
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      stage: match.stage,
      groupName: match.groupName,
      locked,
      prediction: prediction
        ? { homeScore: prediction.homeScore, awayScore: prediction.awayScore }
        : null,
      points,
    };
  });

  return { sync, matches: mappedMatches };
}

export async function savePrediction(
  userId: string,
  data: { matchId: number; homeScore: number; awayScore: number },
) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.externalId, data.matchId))
    .limit(1);

  if (!match) {
    throw new Error("Partido no encontrado");
  }

  if (isMatchLocked(match.kickoffAt, match.status)) {
    throw new Error("Este partido ya está bloqueado");
  }

  await db
    .insert(predictions)
    .values({
      id: crypto.randomUUID(),
      userId,
      matchId: data.matchId,
      homeScore: data.homeScore,
      awayScore: data.awayScore,
    })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: {
        homeScore: data.homeScore,
        awayScore: data.awayScore,
        updatedAt: new Date(),
      },
    });

  return { success: true };
}

export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  await waitForSyncIfInProgress();
  await syncMatchesIfNeeded();

  const players = await db
    .select({
      userId: user.id,
      name: user.name,
      image: user.image,
    })
    .from(user);

  const allMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "FINISHED"));

  const allPredictions = await db.select().from(predictions);

  const pointsByUser = new Map<string, number>();

  for (const player of players) {
    pointsByUser.set(player.userId, 0);
  }

  for (const prediction of allPredictions) {
    const match = allMatches.find((item) => item.externalId === prediction.matchId);
    if (!match) continue;

    const points = calcPoints(
      prediction.homeScore,
      prediction.awayScore,
      match.homeScore,
      match.awayScore,
    );

    pointsByUser.set(
      prediction.userId,
      (pointsByUser.get(prediction.userId) ?? 0) + points,
    );
  }

  const entries = players.map((player) => ({
    userId: player.userId,
    name: player.name,
    image: player.image,
    points: pointsByUser.get(player.userId) ?? 0,
  }));

  return assignRanks(entries);
}

export async function getProfile(userId: string): Promise<ProfileStats> {
  await waitForSyncIfInProgress();
  await syncMatchesIfNeeded();

  const allMatches = await db.select().from(matches).orderBy(desc(matches.kickoffAt));
  const userPredictions = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, userId));

  const predictionMap = new Map(
    userPredictions.map((prediction) => [prediction.matchId, prediction]),
  );

  let totalPoints = 0;
  let exactScores = 0;
  let correctWinners = 0;

  const matchRows = allMatches.map((match) => {
    const prediction = predictionMap.get(match.externalId) ?? null;
    const points =
      match.status === "FINISHED" && prediction
        ? calcPoints(
            prediction.homeScore,
            prediction.awayScore,
            match.homeScore,
            match.awayScore,
          )
        : 0;

    if (match.status === "FINISHED" && prediction) {
      totalPoints += points;
      if (points === 3) exactScores += 1;
      if (points === 1) correctWinners += 1;
    }

    return {
      externalId: match.externalId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      kickoffAt: match.kickoffAt.toISOString(),
      predictedHome: prediction?.homeScore ?? null,
      predictedAway: prediction?.awayScore ?? null,
      actualHome: match.homeScore,
      actualAway: match.awayScore,
      points,
      status: match.status,
    };
  });

  return {
    totalPoints,
    exactScores,
    correctWinners,
    matches: matchRows,
  };
}

export async function getAdminMatches() {
  const finishedMatches = await db
    .select()
    .from(matches)
    .where(eq(matches.status, "FINISHED"))
    .orderBy(desc(matches.kickoffAt));

  return finishedMatches.map((match) => ({
    externalId: match.externalId,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    manualOverride: match.manualOverride,
    kickoffAt: match.kickoffAt.toISOString(),
  }));
}

export async function overrideMatchScore(data: {
  matchId: number;
  homeScore: number;
  awayScore: number;
}) {
  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.externalId, data.matchId))
    .limit(1);

  if (!match) {
    throw new Error("Partido no encontrado");
  }

  await db
    .update(matches)
    .set({
      homeScore: data.homeScore,
      awayScore: data.awayScore,
      status: "FINISHED",
      manualOverride: true,
      updatedAt: new Date(),
    })
    .where(eq(matches.externalId, data.matchId));

  return { success: true };
}

export async function requireAdmin(email: string) {
  if (!isAdminEmail(email)) {
    throw new Error("Admin required");
  }
}
