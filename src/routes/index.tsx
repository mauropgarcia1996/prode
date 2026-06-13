import { createFileRoute, redirect } from "@tanstack/react-router";

import { authQueryOptions } from "#/lib/auth/queries";

export const Route = createFileRoute("/")({
  component: () => null,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });

    if (!user) {
      throw redirect({ to: "/login" });
    }

    throw redirect({ to: "/matches" });
  },
});
