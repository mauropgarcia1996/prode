export function getMatchWinner(
  homeScore: number,
  awayScore: number,
): "HOME" | "AWAY" | "DRAW" {
  if (homeScore > awayScore) return "HOME";
  if (homeScore < awayScore) return "AWAY";
  return "DRAW";
}

export function calcPoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number | null,
  actualAway: number | null,
): number {
  if (actualHome === null || actualAway === null) return 0;

  if (predictedHome === actualHome && predictedAway === actualAway) {
    return 3;
  }

  if (
    getMatchWinner(predictedHome, predictedAway) === getMatchWinner(actualHome, actualAway)
  ) {
    return 1;
  }

  return 0;
}

export function isMatchLocked(kickoffAt: Date, status: string, now = new Date()): boolean {
  if (status === "FINISHED" || status === "LIVE") return true;
  return now >= kickoffAt;
}

export function assignRanks<T extends { points: number }>(
  entries: T[],
): Array<T & { rank: number }> {
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  let rank = 1;

  return sorted.map((entry, index) => {
    if (index > 0 && entry.points < sorted[index - 1]!.points) {
      rank = index + 1;
    }
    return { ...entry, rank };
  });
}
