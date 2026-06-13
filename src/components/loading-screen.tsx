import { LoaderCircleIcon } from "lucide-react";

export function LoadingScreen({ message = "Actualizando partidos..." }: { message?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <LoaderCircleIcon className="size-10 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
