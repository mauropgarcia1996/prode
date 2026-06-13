import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { BottomNav } from "#/components/bottom-nav";
import { LoadingScreen } from "#/components/loading-screen";
import { leaderboardQueryOptions } from "#/lib/prode/queries";

export const Route = createFileRoute("/_auth/_member/leaderboard")({
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { data, isLoading } = useQuery(leaderboardQueryOptions());

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Tabla</h1>
        <p className="text-sm text-muted-foreground">Ranking del prode</p>
      </div>

      {isLoading ? <LoadingScreen message="Cargando tabla..." /> : null}

      {data ? (
        <ol className="space-y-2">
          {data.map((entry) => (
            <li
              key={entry.userId}
              className="flex min-w-0 items-center gap-3 rounded-xl border bg-card px-3 py-3 shadow-sm"
            >
              <span className="w-6 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                {entry.rank}
              </span>
              {entry.image ? (
                <img
                  src={entry.image}
                  alt={entry.name}
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                  {entry.name.slice(0, 1)}
                </div>
              )}
              <span className="min-w-0 flex-1 truncate font-medium">{entry.name}</span>
              <span className="shrink-0 font-mono text-sm font-semibold tabular-nums">
                {entry.points}
              </span>
            </li>
          ))}
        </ol>
      ) : null}

      <BottomNav />
    </>
  );
}
