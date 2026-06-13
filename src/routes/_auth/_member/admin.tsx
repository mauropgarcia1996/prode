import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";

import { BottomNav } from "#/components/bottom-nav";
import { LoadingScreen } from "#/components/loading-screen";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { $overrideMatchScore } from "#/lib/prode/functions";
import { adminMatchesQueryOptions } from "#/lib/prode/queries";

export const Route = createFileRoute("/_auth/_member/admin")({
  component: AdminPage,
  beforeLoad: ({ context }) => {
    if (!context.isAdmin) {
      throw redirect({ to: "/matches" });
    }
  },
});

function AdminPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(adminMatchesQueryOptions());

  const overrideMutation = useMutation({
    mutationFn: $overrideMatchScore,
    onSuccess: () => {
      toast.success("Resultado actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-matches"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar");
    },
  });

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground">Corregí resultados si la API falló</p>
      </div>

      {isLoading ? <LoadingScreen message="Cargando partidos..." /> : null}

      {data ? (
        <div className="space-y-4">
          {data.map((match) => (
            <AdminMatchRow
              key={match.externalId}
              match={match}
              saving={overrideMutation.isPending}
              onSave={(homeScore, awayScore) =>
                overrideMutation.mutate({
                  data: {
                    matchId: match.externalId,
                    homeScore,
                    awayScore,
                  },
                })
              }
            />
          ))}
        </div>
      ) : null}

      <BottomNav />
    </>
  );
}

function AdminMatchRow({
  match,
  saving,
  onSave,
}: {
  match: {
    externalId: number;
    homeTeam: string;
    awayTeam: string;
    homeScore: number | null;
    awayScore: number | null;
    manualOverride: boolean;
  };
  saving: boolean;
  onSave: (homeScore: number, awayScore: number) => void;
}) {
  const [homeScore, setHomeScore] = useState(String(match.homeScore ?? 0));
  const [awayScore, setAwayScore] = useState(String(match.awayScore ?? 0));

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="font-medium">
          <span className="font-mono text-sm font-bold tracking-wider">
            {match.homeTeam} vs {match.awayTeam}
          </span>
        </div>
        {match.manualOverride ? (
          <span className="text-xs text-amber-700">Manual</span>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={20}
          className="w-20"
          value={homeScore}
          onChange={(event) => setHomeScore(event.target.value)}
        />
        <span>:</span>
        <Input
          type="number"
          min={0}
          max={20}
          className="w-20"
          value={awayScore}
          onChange={(event) => setAwayScore(event.target.value)}
        />
        <Button
          size="sm"
          disabled={saving}
          onClick={() => onSave(Number(homeScore), Number(awayScore))}
        >
          Guardar
        </Button>
      </div>
    </div>
  );
}
