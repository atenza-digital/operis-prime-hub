import { AlertTriangle } from "lucide-react";
import { APP_ENVIRONMENT, APP_ENVIRONMENT_KIND } from "@/lib/version";
import { cn } from "@/lib/utils";

export function EnvironmentBadge({ className }: { className?: string }) {
  const isHomologation = APP_ENVIRONMENT_KIND === "homologation";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] shadow-sm",
        isHomologation
          ? "border-amber-700/45 bg-amber-400 text-amber-950 shadow-amber-900/10"
          : "border-emerald-700/30 bg-emerald-100 text-emerald-900",
        className,
      )}
      title={`Ambiente: ${APP_ENVIRONMENT}`}
    >
      {isHomologation ? <AlertTriangle className="h-4 w-4" /> : null}
      {APP_ENVIRONMENT}
    </div>
  );
}
