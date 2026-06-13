import * as z from "zod";

import type { MatchStage, MatchStatus } from "#/lib/prode/types";

const teamSchema = z.object({
  id: z.number().nullable(),
  name: z.string().nullable(),
  shortName: z.string().nullable().optional(),
  tla: z.string().nullable().optional(),
  crest: z.string().nullable().optional(),
});

const matchSchema = z.object({
  id: z.number(),
  utcDate: z.string(),
  status: z.string(),
  stage: z.string(),
  group: z.string().nullable().optional(),
  homeTeam: teamSchema,
  awayTeam: teamSchema,
  score: z
    .object({
      fullTime: z
        .object({
          home: z.number().nullable(),
          away: z.number().nullable(),
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const matchesResponseSchema = z.object({
  matches: z.array(matchSchema),
});

export type FootballDataMatch = z.infer<typeof matchSchema>;

export interface NormalizedMatch {
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoffAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  stage: MatchStage;
  groupName: string | null;
}

const STAGE_MAP: Record<string, MatchStage> = {
  GROUP_STAGE: "GROUP",
  LAST_16: "LAST_16",
  QUARTER_FINALS: "QUARTER",
  SEMI_FINALS: "SEMI",
  THIRD_PLACE: "THIRD_PLACE",
  FINAL: "FINAL",
};

function mapStatus(apiStatus: string): MatchStatus {
  switch (apiStatus) {
    case "FINISHED":
      return "FINISHED";
    case "IN_PLAY":
    case "PAUSED":
    case "LIVE":
      return "LIVE";
    case "POSTPONED":
    case "SUSPENDED":
      return "POSTPONED";
    case "SCHEDULED":
    case "TIMED":
      return "SCHEDULED";
    case "CANCELLED":
      return "POSTPONED";
    default:
      return "SCHEDULED";
  }
}

function mapGroupName(group: string | null | undefined): string | null {
  if (!group) return null;
  const match = group.match(/GROUP_([A-Z])/);
  return match?.[1] ?? null;
}

function resolveTeamCode(team: z.infer<typeof teamSchema>): string | null {
  const name = team.name?.trim();
  if (!name) return null;

  const tla = team.tla?.trim().toUpperCase();
  if (tla && tla.length >= 2 && tla.length <= 4) return tla;

  const shortName = team.shortName?.trim().toUpperCase();
  if (shortName && shortName.length >= 2 && shortName.length <= 4) return shortName;

  return name.slice(0, 3).toUpperCase();
}

export function normalizeMatch(match: FootballDataMatch): NormalizedMatch | null {
  const stage = STAGE_MAP[match.stage];
  if (!stage) return null;

  const homeTeam = resolveTeamCode(match.homeTeam);
  const awayTeam = resolveTeamCode(match.awayTeam);
  if (!homeTeam || !awayTeam) return null;

  const homeScore = match.score?.fullTime?.home ?? null;
  const awayScore = match.score?.fullTime?.away ?? null;

  return {
    externalId: match.id,
    homeTeam,
    awayTeam,
    homeCrest: match.homeTeam.crest ?? null,
    awayCrest: match.awayTeam.crest ?? null,
    kickoffAt: new Date(match.utcDate),
    homeScore,
    awayScore,
    status: mapStatus(match.status),
    stage,
    groupName: stage === "GROUP" ? mapGroupName(match.group) : null,
  };
}

export async function fetchCompetitionMatches(
  apiKey: string,
  competition: string,
  season: number,
): Promise<NormalizedMatch[]> {
  const url = new URL(
    `https://api.football-data.org/v4/competitions/${competition}/matches`,
  );
  url.searchParams.set("season", String(season));

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "X-Auth-Token": apiKey },
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `football-data.org responded with ${response.status}: ${body.slice(0, 200)}`,
        );
      }

      const json = matchesResponseSchema.parse(await response.json());
      return json.matches
        .map(normalizeMatch)
        .filter((match): match is NormalizedMatch => match !== null);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown sync error");
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("Failed to sync matches");
}
