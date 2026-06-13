export type MatchStage = "GROUP" | "LAST_16" | "QUARTER" | "SEMI" | "THIRD_PLACE" | "FINAL";

export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED";

export interface MatchWithPrediction {
  externalId: number;
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  kickoffAt: string;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  stage: MatchStage;
  groupName: string | null;
  locked: boolean;
  prediction: {
    homeScore: number;
    awayScore: number;
  } | null;
  points: number | null;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  points: number;
  rank: number;
}

export interface ProfileStats {
  totalPoints: number;
  exactScores: number;
  correctWinners: number;
  matches: Array<{
    externalId: number;
    homeTeam: string;
    awayTeam: string;
    kickoffAt: string;
    predictedHome: number | null;
    predictedAway: number | null;
    actualHome: number | null;
    actualAway: number | null;
    points: number;
    status: MatchStatus;
  }>;
}

export interface SyncResult {
  synced: boolean;
  stale: boolean;
  error: string | null;
  lastSyncAt: string | null;
}
