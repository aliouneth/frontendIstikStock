"use client";

import type { RiskFlag } from "@/lib/types";

export default function RiskBadges({ risks }: { risks?: RiskFlag[] }) {
  if (!risks || risks.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Risk flags">
      {risks.map((risk) => (
        <span
          key={risk.code}
          title={risk.detail}
          className="rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-700"
        >
          {risk.label}
        </span>
      ))}
    </div>
  );
}
