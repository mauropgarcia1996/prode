import { useEffect, useMemo, useRef, useState } from "react";
import { format, isToday } from "date-fns";
import { es } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "#/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#/components/ui/collapsible";
import { Input } from "#/components/ui/input";
import { $savePrediction } from "#/lib/prode/functions";
import type { MatchWithPrediction } from "#/lib/prode/types";
import { cn } from "#/lib/utils";

type PhaseTab = "groups" | "knockout";

function TeamCrest({ crest, code }: { crest: string | null; code: string }) {
  if (!crest) {
    return (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[10px] font-bold tracking-wide">
        {code}
      </div>
    );
  }

  return <img src={crest} alt={code} className="size-7 shrink-0 object-contain" />;
}

function TeamCode({ code, align }: { code: string; align: "left" | "right" }) {
  return (
    <span
      className={cn(
        "min-w-0 overflow-hidden font-mono text-sm font-bold tracking-wider",
        align === "right" ? "text-right" : "text-left",
      )}
    >
      {code}
    </span>
  );
}

function formatScoreLine(home: number | null, away: number | null) {
  if (home === null || away === null) return null;
  return `${home}:${away}`;
}

function ScoreColumn({
  match,
  size = "default",
}: {
  match: MatchWithPrediction;
  size?: "default" | "compact";
}) {
  const apiScore = formatScoreLine(match.homeScore, match.awayScore);
  const predictionClass =
    size === "compact"
      ? "font-mono text-sm font-bold tabular-nums"
      : "font-mono text-lg font-bold tabular-nums";

  return (
    <div className={cn("flex flex-col items-center gap-0.5", size === "compact" ? "min-w-12" : "min-w-14")}>
      {apiScore ? (
        <span
          className={cn(
            "font-mono text-[10px] leading-none tabular-nums",
            match.status === "LIVE"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-muted-foreground",
          )}
        >
          {apiScore}
        </span>
      ) : null}
      {match.prediction ? (
        <span className={predictionClass}>
          {match.prediction.homeScore}:{match.prediction.awayScore}
        </span>
      ) : (
        <span className={cn(predictionClass, "text-muted-foreground")}>—</span>
      )}
    </div>
  );
}

function formatUpcomingKickoff(match: MatchWithPrediction) {
  if (match.status === "LIVE") return "En vivo";

  const kickoff = new Date(match.kickoffAt);
  if (isToday(kickoff)) return `Hoy ${format(kickoff, "HH:mm", { locale: es })}`;
  return format(kickoff, "EEE d MMM HH:mm", { locale: es });
}

function UpcomingMatchRow({ match }: { match: MatchWithPrediction }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
        <span
          className={cn(
            match.status === "LIVE" && "font-medium text-emerald-600 dark:text-emerald-400",
          )}
        >
          {formatUpcomingKickoff(match)}
        </span>
        <div className="flex flex-wrap items-center gap-1">
          {match.locked ? <Badge variant="muted" className="px-1.5 py-0 text-[10px]">Bloqueado</Badge> : null}
          {!match.prediction && !match.locked ? (
            <Badge variant="warning" className="px-1.5 py-0 text-[10px]">
              Sin predicción
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <TeamCrest crest={match.homeCrest} code={match.homeTeam} />
          <span className="font-mono text-xs font-bold tracking-wider">{match.homeTeam}</span>
        </div>

        <ScoreColumn match={match} size="compact" />

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="font-mono text-xs font-bold tracking-wider">{match.awayTeam}</span>
          <TeamCrest crest={match.awayCrest} code={match.awayTeam} />
        </div>
      </div>
    </div>
  );
}

function UpcomingMatches({ matches }: { matches: MatchWithPrediction[] }) {
  if (matches.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">Próximos partidos</h2>
      <div className="grid gap-2">
        {matches.map((match) => (
          <UpcomingMatchRow key={match.externalId} match={match} />
        ))}
      </div>
    </section>
  );
}

function MatchRow({ match }: { match: MatchWithPrediction }) {
  const queryClient = useQueryClient();
  const [homeScore, setHomeScore] = useState(
    match.prediction ? String(match.prediction.homeScore) : "",
  );
  const [awayScore, setAwayScore] = useState(
    match.prediction ? String(match.prediction.awayScore) : "",
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHomeScore(match.prediction ? String(match.prediction.homeScore) : "");
    setAwayScore(match.prediction ? String(match.prediction.awayScore) : "");
  }, [match.prediction]);

  const saveMutation = useMutation({
    mutationFn: $savePrediction,
    onSuccess: () => {
      toast.success("Predicción guardada");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar");
    },
  });

  const scheduleSave = (nextHome: string, nextAway: string) => {
    if (match.locked) return;

    const home = Number(nextHome);
    const away = Number(nextAway);

    if (
      nextHome === "" ||
      nextAway === "" ||
      Number.isNaN(home) ||
      Number.isNaN(away) ||
      home < 0 ||
      away < 0 ||
      home > 20 ||
      away > 20
    ) {
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      saveMutation.mutate({
        data: {
          matchId: match.externalId,
          homeScore: home,
          awayScore: away,
        },
      });
    }, 1000);
  };

  const kickoffLabel = format(new Date(match.kickoffAt), "EEE d MMM HH:mm", { locale: es });

  return (
    <div className="space-y-3 border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="min-w-0">{kickoffLabel}</span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {match.locked ? <Badge variant="muted">Bloqueado</Badge> : null}
          {!match.prediction && !match.locked ? (
            <Badge variant="warning">Sin predicción</Badge>
          ) : null}
          {match.points !== null ? <Badge variant="success">{match.points} pt</Badge> : null}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <TeamCrest crest={match.homeCrest} code={match.homeTeam} />
          <TeamCode code={match.homeTeam} align="left" />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {match.locked ? (
            <ScoreColumn match={match} />
          ) : (
            <>
              <Input
                type="number"
                min={0}
                max={20}
                inputMode="numeric"
                aria-label={`Goles ${match.homeTeam}`}
                className="h-11 w-12 px-1 text-center font-mono tabular-nums sm:h-10 sm:w-14"
                value={homeScore}
                onChange={(event) => {
                  const value = event.target.value;
                  setHomeScore(value);
                  scheduleSave(value, awayScore);
                }}
              />
              <span className="font-mono text-muted-foreground">:</span>
              <Input
                type="number"
                min={0}
                max={20}
                inputMode="numeric"
                aria-label={`Goles ${match.awayTeam}`}
                className="h-11 w-12 px-1 text-center font-mono tabular-nums sm:h-10 sm:w-14"
                value={awayScore}
                onChange={(event) => {
                  const value = event.target.value;
                  setAwayScore(value);
                  scheduleSave(homeScore, value);
                }}
              />
            </>
          )}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          <TeamCode code={match.awayTeam} align="right" />
          <TeamCrest crest={match.awayCrest} code={match.awayTeam} />
        </div>
      </div>
    </div>
  );
}

function sectionStats(sectionMatches: MatchWithPrediction[]) {
  const openMatches = sectionMatches.filter((match) => !match.locked);
  const pending = openMatches.filter((match) => !match.prediction).length;
  const predicted = openMatches.length - pending;

  return {
    pending,
    predicted,
    open: openMatches.length,
    total: sectionMatches.length,
  };
}

function sectionSubtitle(sectionMatches: MatchWithPrediction[]) {
  const { pending, predicted, open, total } = sectionStats(sectionMatches);

  if (open === 0) return `${total} partidos · cerrados`;
  if (pending > 0) return `${pending} pendientes · ${predicted}/${open} listos`;
  return `${predicted}/${open} predichos`;
}

function PhaseTabBar({
  tab,
  onChange,
}: {
  tab: PhaseTab;
  onChange: (tab: PhaseTab) => void;
}) {
  return (
    <div
      className="flex rounded-xl border bg-muted/60 p-1"
      role="tablist"
      aria-label="Fase del torneo"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "groups"}
        className={cn(
          "flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
          tab === "groups"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
        onClick={() => onChange("groups")}
      >
        Grupos
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "knockout"}
        className={cn(
          "flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors",
          tab === "knockout"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
        onClick={() => onChange("knockout")}
      >
        Eliminatorias
      </button>
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="min-w-0 rounded-xl border bg-card shadow-sm">
      <CollapsibleTrigger className="group flex w-full min-h-11 items-center justify-between gap-3 border-b px-4 py-3 text-left">
        <div className="min-w-0">
          <div className="font-semibold">{title}</div>
          <div className="text-xs text-muted-foreground">{subtitle}</div>
        </div>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-panel-open:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function MatchesView({ matches }: { matches: MatchWithPrediction[] }) {
  const groupMatches = matches.filter((match) => match.stage === "GROUP");
  const knockoutMatches = matches.filter((match) => match.stage !== "GROUP");

  const groups = Array.from(
    new Set(groupMatches.map((match) => match.groupName).filter(Boolean) as string[]),
  ).sort();

  const knockoutStages = [
    { key: "LAST_16", label: "Octavos" },
    { key: "QUARTER", label: "Cuartos" },
    { key: "SEMI", label: "Semifinales" },
    { key: "THIRD_PLACE", label: "Tercer puesto" },
    { key: "FINAL", label: "Final" },
  ] as const;

  const missingPredictions = matches.filter(
    (match) => !match.locked && !match.prediction,
  ).length;

  const [tab, setTab] = useState<PhaseTab>(() =>
    groupMatches.length > 0 ? "groups" : "knockout",
  );

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter((match) => match.status !== "FINISHED")
        .sort(
          (left, right) =>
            new Date(left.kickoffAt).getTime() - new Date(right.kickoffAt).getTime(),
        )
        .slice(0, 4),
    [matches],
  );

  return (
    <div className="space-y-6">
      {missingPredictions > 0 ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
          Te faltan {missingPredictions} predicciones
        </div>
      ) : null}

      <UpcomingMatches matches={upcomingMatches} />

      <PhaseTabBar tab={tab} onChange={setTab} />

      {tab === "groups" ? (
        <section className="grid gap-4">
          {groups.length > 0 ? (
            groups.map((group) => {
              const sectionMatches = groupMatches.filter((match) => match.groupName === group);
              const { pending } = sectionStats(sectionMatches);

              return (
                <CollapsibleSection
                  key={group}
                  title={`Grupo ${group}`}
                  subtitle={sectionSubtitle(sectionMatches)}
                  defaultOpen={pending > 0}
                >
                  {sectionMatches.map((match) => (
                    <MatchRow key={match.externalId} match={match} />
                  ))}
                </CollapsibleSection>
              );
            })
          ) : (
            <div className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
              Todavía no hay partidos de grupos.
            </div>
          )}
        </section>
      ) : (
        <section className="grid gap-4">
          {knockoutStages.map((stage) => {
            const stageMatches = knockoutMatches.filter((match) => match.stage === stage.key);
            if (stageMatches.length === 0) return null;
            const { pending } = sectionStats(stageMatches);

            return (
              <CollapsibleSection
                key={stage.key}
                title={stage.label}
                subtitle={sectionSubtitle(stageMatches)}
                defaultOpen={pending > 0}
              >
                {stageMatches.map((match) => (
                  <MatchRow key={match.externalId} match={match} />
                ))}
              </CollapsibleSection>
            );
          })}
          {knockoutMatches.length === 0 ? (
            <div className="rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground shadow-sm">
              Todavía no hay partidos de eliminatorias.
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
