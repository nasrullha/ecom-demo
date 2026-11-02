import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md py-6 sm:py-12">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {subtitle ? <p className="mt-2 text-muted">{subtitle}</p> : null}
      <Card className="mt-6 p-6">{children}</Card>
      {footer ? <p className="mt-5 text-center text-sm text-muted">{footer}</p> : null}
    </div>
  );
}
