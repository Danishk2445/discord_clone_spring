"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { login } from "@/lib/client-api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(email, password);
    if (result.ok) {
      router.replace("/channels/me");
      router.refresh();
    } else {
      setError(
        result.error === "invalid_credentials"
          ? "Wrong email or password."
          : "Could not log in. Try again.",
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Welcome back</h2>
      <p className="-mt-2 text-xs text-text-muted">
        We&apos;re excited to see you again.
      </p>

      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </Field>

      <Field label="Password">
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </Field>

      {error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-accent py-2 text-sm font-semibold text-bg transition-colors hover:bg-accent-strong disabled:opacity-50"
      >
        {submitting ? "Logging in…" : "Log in"}
      </button>

      <p className="pt-2 text-xs text-text-muted">
        Need an account?{" "}
        <Link
          href="/register"
          className="font-medium text-accent hover:underline"
        >
          Register
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      {children}
    </label>
  );
}
