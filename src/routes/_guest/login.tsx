import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { LoaderCircleIcon, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { authClient } from "#/lib/auth/auth-client";

export const Route = createFileRoute("/_guest/login")({
  component: LoginPage,
});

function LoginPage() {
  const { redirectUrl } = Route.useRouteContext();

  const { mutate: login, isPending } = useMutation({
    mutationFn: async (data: { email: string; password: string }) =>
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
          callbackURL: redirectUrl,
        },
        {
          onError: ({ error }) => {
            toast.error(error.message || "No se pudo iniciar sesión");
          },
        },
      ),
  });

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isPending) return;

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) return;

    login({ email, password });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Trophy className="size-6" />
        </div>
        <h1 className="text-2xl font-bold">Prode Mundial 2026</h1>
        <p className="text-sm text-muted-foreground">Ingresá con tu email y contraseña.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="admin@test.com"
            autoComplete="email"
            readOnly={isPending}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            readOnly={isPending}
            required
          />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? <LoaderCircleIcon className="animate-spin" /> : null}
          {isPending ? "Ingresando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
