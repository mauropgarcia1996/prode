import { queryOptions } from "@tanstack/react-query";

import {
  $getAdminMatches,
  $getAppContext,
  $getLeaderboard,
  $getProfile,
  $syncAndLoadMatches,
} from "#/lib/prode/functions";

export const appContextQueryOptions = () =>
  queryOptions({
    queryKey: ["app-context"],
    queryFn: ({ signal }) => $getAppContext({ signal }),
  });

export const matchesQueryOptions = () =>
  queryOptions({
    queryKey: ["matches"],
    queryFn: ({ signal }) => $syncAndLoadMatches({ signal }),
    staleTime: 30_000,
    refetchInterval: (query) => (query.state.data?.sync.stale ? 10_000 : false),
  });

export const leaderboardQueryOptions = () =>
  queryOptions({
    queryKey: ["leaderboard"],
    queryFn: ({ signal }) => $getLeaderboard({ signal }),
  });

export const profileQueryOptions = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: ({ signal }) => $getProfile({ signal }),
  });

export const adminMatchesQueryOptions = () =>
  queryOptions({
    queryKey: ["admin-matches"],
    queryFn: ({ signal }) => $getAdminMatches({ signal }),
  });
