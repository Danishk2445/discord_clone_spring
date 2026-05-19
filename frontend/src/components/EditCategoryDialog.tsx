"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCategory, updateCategory } from "@/lib/client-api";
import type { Category } from "@/lib/types";
import { Dialog } from "./Dialog";

export function EditCategoryDialog({
  open,
  onClose,
  category,
  channelCount,
}: {
  open: boolean;
  onClose: () => void;
  category: Category;
  channelCount: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 32;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    const updated = await updateCategory(category.serverId, category.id, {
      name: trimmed,
    });
    setSubmitting(false);
    if (!updated) {
      setError("Could not save changes.");
      return;
    }
    onClose();
    router.refresh();
  };

  const onDelete = async () => {
    const warning =
      channelCount > 0
        ? `Delete "${category.name}"? This will also delete ${channelCount} channel${channelCount === 1 ? "" : "s"} inside it.`
        : `Delete "${category.name}"?`;
    if (!confirm(warning)) return;
    const ok = await deleteCategory(category.serverId, category.id);
    if (!ok) {
      setError("Could not delete category.");
      return;
    }
    onClose();
    router.refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Edit ${category.name}`}>
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

        <div className="flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete category
          </button>
          <div className="flex gap-2">
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
              {submitting ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
