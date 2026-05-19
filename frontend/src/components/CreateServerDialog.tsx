"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createServer } from "@/lib/client-api";
import { Dialog } from "./Dialog";
import { cn } from "@/lib/cn";

const ACCENT_OPTIONS = [
  "#80cfc4", "#f6a5d3", "#a5b4fc", "#fcd34d", "#86efac",
  "#fca5a5", "#c4b5fd", "#fdba74", "#67e8f9", "#f0abfc",
];

export function CreateServerDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accent, setAccent] = useState(ACCENT_OPTIONS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    const server = await createServer({ name: name.trim(), accent });
    setSubmitting(false);
    if (!server) {
      setError("Could not create server.");
      return;
    }
    setName("");
    onClose();
    router.push(`/channels/${server.id}`);
    router.refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create your server">
      <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
        <p className="text-xs text-text-muted">
          Your server is where you and your friends hang out. Make yours and start talking.
        </p>

        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Server name
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            autoFocus
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
        </label>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Accent color
          </div>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setAccent(c)}
                aria-label={`Use ${c}`}
                className={cn(
                  "h-7 w-7 rounded-full ring-2 transition-all",
                  accent === c ? "ring-text" : "ring-transparent",
                )}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-2 text-sm text-text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
