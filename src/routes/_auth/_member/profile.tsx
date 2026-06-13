import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { LogOut } from "lucide-react";

import { BottomNav } from "#/components/bottom-nav";
import { LoadingScreen } from "#/components/loading-screen";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { authClient } from "#/lib/auth/auth-client";
import { profileQueryOptions } from "#/lib/prode/queries";

export const Route = createFileRoute("/_auth/_member/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data, isLoading } = useQuery(profileQueryOptions());

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Perfil</h1>
          <p className="text-sm text-muted-foreground">Tus resultados en el prode</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cerrar sesión"
          onClick={() => authClient.signOut()}
        >
          <LogOut className="size-5" />
        </Button>
      </div>

      {isLoading ? <LoadingScreen message="Cargando perfil..." /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Total" value={data.totalPoints} />
            <StatCard label="Exactos" value={data.exactScores} />
            <StatCard label="Aciertos" value={data.correctWinners} />
          </div>

          <div className="space-y-3">
            {data.matches.map((match) => (
              <article
                key={match.externalId}
                className="min-w-0 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold tracking-wider">
                      {match.homeTeam} – {match.awayTeam}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(match.kickoffAt), "d MMM HH:mm", { locale: es })}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums">{match.points} pt</span>
                </div>

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Predicción</dt>
                    <dd className="mt-1 font-mono tabular-nums">
                      {match.predictedHome !== null && match.predictedAway !== null ? (
                        `${match.predictedHome} – ${match.predictedAway}`
                      ) : (
                        <Badge variant="warning">Sin predicción</Badge>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Resultado</dt>
                    <dd className="mt-1 font-mono tabular-nums">
                      {match.status === "FINISHED" ? (
                        `${match.actualHome} – ${match.actualAway}`
                      ) : (
                        <span className="text-muted-foreground">Pendiente</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-center shadow-sm">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
