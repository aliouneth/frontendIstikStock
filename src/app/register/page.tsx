"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteLogo from "@/components/SiteLogo";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register, plans } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const defaultPlan = plans.find((p) => p.is_default) ?? plans[0];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await register(name.trim(), email.trim(), password, confirmation);
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="flex flex-col items-center">
        <SiteLogo size="md" priority />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Create account</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          New accounts start on the{" "}
          <strong className="text-slate-700">{defaultPlan?.name ?? "Free"}</strong>{" "}
          plan. An administrator can upgrade you at any time.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Full name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
          <p className="mt-1 text-[11px] text-slate-400">Minimum 8 characters.</p>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Confirm password
          </label>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
          />
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-sky-700 hover:underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
