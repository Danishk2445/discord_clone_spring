"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { register } from "@/lib/client-api";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await register(email, password, username);
    if (result.ok) {
      router.replace("/channels/me");
      router.refresh();
    } else {
      setError(
        result.error === "email_taken"
          ? "Email is already in use."
          : result.error === "invalid_input"
            ? "Check the fields and try again."
            : "Could not create your account.",
      );
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">Create an account</h2>
      <p className="-mt-2 text-xs text-text-muted">
        Get started in a few seconds.
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

      <Field label="Username">
        <input
          type="text"
          required
          minLength={2}
          maxLength={32}
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60"
        />
      </Field>

      <Field label="Password" hint="At least 6 characters">
        <input
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
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
        {submitting ? "Creating account…" : "Continue"}
      </button>

      <p className="pt-2 text-xs text-text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-accent hover:underline"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {hint ? (
          <span className="text-[11px] text-text-dim">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
