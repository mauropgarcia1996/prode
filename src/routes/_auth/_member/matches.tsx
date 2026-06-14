import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { BottomNav } from "#/components/bottom-nav";
import { LoadingScreen } from "#/components/loading-screen";
import { MatchesView } from "#/components/matches-view";
import { matchesQueryOptions } from "#/lib/prode/queries";

export const Route = createFileRoute("/_auth/_member/matches")({
  loader: ({ context }) => context.queryClient.ensureQueryData(matchesQueryOptions()),
  component: MatchesPage,
});

function MatchesPage() {
  const { isAdmin } = Route.useRouteContext();
  const { data, isPending, isError } = useQuery(matchesQueryOptions());

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Partidos</h1>
          <p className="text-sm text-muted-foreground">Hacé tus predicciones antes del kickoff</p>
        </div>
        {isAdmin ? (
          <Link to="/admin" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Admin
          </Link>
        ) : null}
      </div>

      {isPending ? <LoadingScreen /> : null}
      {isError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          No se pudieron cargar los partidos.
        </div>
      ) : null}
      {data?.sync.stale && data.sync.error ? (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Datos desactualizados: {data.sync.error}
        </div>
      ) : null}
      {data ? <MatchesView matches={data.matches} /> : null}
      <BottomNav />
    </>
  );
}
