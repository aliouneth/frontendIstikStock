"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import type { FeatureKey } from "@/lib/types";

export function LockedBadge({ feature }: { feature: FeatureKey }) {
  const { featureLabels } = useAuth();
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
      🔒 {featureLabels[feature] ?? feature}
    </span>
  );
}

export function LockedPanel({
  feature,
  message,
}: {
  feature: FeatureKey;
  message?: string;
}) {
  const { user, featureLabels } = useAuth();
  const label = featureLabels[feature] ?? feature;

  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/60 p-12 text-center">
      <div className="text-3xl">🔒</div>
      <h3 className="mt-3 text-base font-semibold text-amber-900">{label}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-amber-800">
        {message ??
          `${label} is not part of your current plan. Ask an administrator to upgrade your subscription to unlock it.`}
      </p>
      {!user && (
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/login"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Create account
          </Link>
        </div>
      )}
    </div>
  );
}

export function LockedButton({
  feature,
  children,
  className,
}: {
  feature: FeatureKey;
  children: React.ReactNode;
  className?: string;
}) {
  const { can } = useAuth();
  if (can(feature)) {
    return (
      <button className={className} disabled={false}>
        {children}
      </button>
    );
  }
  return (
    <span
      className={`${className ?? ""} inline-flex cursor-not-allowed items-center gap-2 opacity-50`}
      title="Upgrade your plan to unlock"
    >
      {children}
      <span className="text-xs">🔒</span>
    </span>
  );
}
