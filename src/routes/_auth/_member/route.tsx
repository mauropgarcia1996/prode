import { createFileRoute, Outlet } from "@tanstack/react-router";

import { appContextQueryOptions } from "#/lib/prode/queries";

export const Route = createFileRoute("/_auth/_member")({
  component: MemberLayout,
  beforeLoad: async ({ context }) => {
    const appContext = await context.queryClient.ensureQueryData({
      ...appContextQueryOptions(),
      revalidateIfStale: true,
    });

    return {
      isAdmin: appContext.isAdmin,
    };
  },
});

function MemberLayout() {
  return (
    <div className="min-h-svh bg-background pb-24">
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
