"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCategory } from "@/lib/client-api";
import { Dialog } from "./Dialog";

export function CreateCategoryDialog({
  open,
  onClose,
  serverId,
}: {
  open: boolean;
  onClose: () => void;
  serverId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 32;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    const cat = await createCategory(serverId, { name: trimmed });
    setSubmitting(false);
    if (!cat) {
      setError("Could not create category.");
      return;
    }
    setName("");
    onClose();
    router.refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Category">
      <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Category name
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            maxLength={32}
            placeholder="New Category"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
          {name && !valid ? (
            <p className="mt-1 text-[11px] text-danger">
              Names must be 1–32 characters.
            </p>
          ) : null}
        </label>

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
            disabled={!valid || submitting}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
          >
            {submitting ? "Creating…" : "Create Category"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
