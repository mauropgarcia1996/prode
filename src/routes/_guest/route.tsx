import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import * as z from "zod";

import { authQueryOptions } from "#/lib/auth/queries";

export const Route = createFileRoute("/_guest")({
  validateSearch: z.object({
    redirect: z.string().optional(),
  }),
  component: RouteComponent,
  beforeLoad: async ({ context, search }) => {
    const redirectUrl = search.redirect ?? "/matches";

    const user = await context.queryClient.ensureQueryData({
      ...authQueryOptions(),
      revalidateIfStale: true,
    });

    if (user) {
      throw redirect({ to: redirectUrl });
    }

    return {
      redirectUrl,
    };
  },
});

function RouteComponent() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
