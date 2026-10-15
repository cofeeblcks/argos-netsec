import type { ReactNode } from "react";
import { cx } from "@/utils/cx";

interface MetricCardProps {
    label: string;
    value: ReactNode;
    hint?: string;
    accent?: boolean;
    className?: string;
}

/** Metric tile matching Untitled UI Dashboard 04 analytics cards. */
export function MetricCard({ label, value, hint, accent, className }: MetricCardProps) {
    return (
        <div className={cx("rounded-xl bg-primary p-5 shadow-xs ring-1 ring-secondary", className)}>
            <p className="text-sm font-medium text-tertiary">{label}</p>
            <p className={cx("mt-2 text-display-sm font-semibold", accent ? "text-error-primary" : "text-primary")}>{value}</p>
            {hint ? <p className="mt-1 text-sm text-tertiary">{hint}</p> : null}
        </div>
    );
}
