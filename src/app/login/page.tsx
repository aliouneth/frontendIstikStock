"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import SiteLogo from "@/components/SiteLogo";
import { useAuth } from "@/components/AuthProvider";
import { ApiError } from "@/lib/api";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const next = params.get("next") ?? "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      router.push(user?.is_admin && next === "/" ? "/admin" : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <div className="flex flex-col items-center">
        <SiteLogo size="md" priority />
        <h1 className="mt-4 text-xl font-bold text-slate-900">Sign in</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          Access your subscription, saved plan and gated research features.
        </p>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        No account?{" "}
        <Link href="/register" className="font-semibold text-sky-700 hover:underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
