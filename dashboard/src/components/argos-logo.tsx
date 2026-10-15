import type { HTMLAttributes } from "react";
import { cx } from "@/utils/cx";

export function ArgosLogo({ className, ...props }: HTMLAttributes<HTMLAnchorElement>) {
    return (
        <a
            href="/"
            aria-label="Argos NetSec"
            className={cx("flex h-8 items-center gap-2.5 rounded-xs outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2", className)}
            {...props}
        >
            <img src="/logo.svg" alt="" className="size-8" />
            <span className="text-lg font-semibold text-primary">
                Argos <span className="font-normal text-tertiary">NetSec</span>
            </span>
        </a>
    );
}
