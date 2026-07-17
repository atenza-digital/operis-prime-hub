import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageHeaderCrumb {
  label: string;
  to?: string;
}

export interface PageHeaderAction {
  label: string;
  to?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
}

export function PageHeader({
  eyebrow,
  title,
  description,
  crumbs = [],
  actions = [],
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: PageHeaderCrumb[];
  actions?: PageHeaderAction[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-border/70 bg-card p-5 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          {crumbs.length > 0 ? (
            <Breadcrumb>
              <BreadcrumbList className="text-xs text-muted-foreground">
                {crumbs.map((crumb, index) => (
                  <div key={`${crumb.label}-${index}`} className="contents">
                    <BreadcrumbItem>
                      {crumb.to ? (
                        <BreadcrumbLink asChild>
                          <Link to={crumb.to}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {index < crumbs.length - 1 ? <BreadcrumbSeparator /> : null}
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          ) : null}

          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80">{eyebrow}</p>
          ) : null}

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
            {description ? <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
        </div>

        {actions.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {actions.map((action) => {
              const content = (
                <Button key={action.label} variant={action.variant ?? "outline"} onClick={action.onClick} className="min-w-0">
                  {action.label}
                </Button>
              );

              return action.to ? (
                <Button key={action.label} asChild variant={action.variant ?? "outline"} className="min-w-0">
                  <Link to={action.to}>{action.label}</Link>
                </Button>
              ) : (
                content
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
