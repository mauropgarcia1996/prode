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
