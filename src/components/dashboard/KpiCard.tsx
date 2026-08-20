import type { ReactNode } from "react";

export interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  /** CSS color value (often a `var(--token)` reference) for the icon tile background. */
  accent: string;
}

export default function KpiCard({ icon, label, value, accent }: KpiCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-[13px] border border-border bg-surface px-4 py-3.5">
      <div
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] text-white"
        style={{ background: accent }}
      >
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-ink-muted">{label}</div>
        <div className="mt-px font-mono text-[19px] font-semibold">{value}</div>
      </div>
    </div>
  );
}
