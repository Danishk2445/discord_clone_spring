"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Dialog } from "./Dialog";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/cn";
import { createGroupDm, listFriends } from "@/lib/client-api";
import type { Friend } from "@/lib/types";

export function CreateGroupDmDialog({
  open,
  onClose,
  selfId,
}: {
  open: boolean;
  onClose: () => void;
  selfId: string;
}) {
  void selfId;
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const fs = await listFriends("all");
      if (!cancelled) setFriends(fs);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 9) next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (selected.size < 2) {
      setError("Pick at least 2 friends for a group DM.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const dm = await createGroupDm([...selected], name.trim() || undefined);
    setSubmitting(false);
    if (!dm) {
      setError("Could not create group.");
      return;
    }
    onClose();
    router.refresh();
    router.push(`/channels/me/${dm.id}`);
  };

  return (
    <Dialog open={open} onClose={onClose} title="New group DM" size="md">
      <div className="px-5 py-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-text-muted">
          Name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 100))}
          placeholder="Untitled group"
          className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-accent/60"
        />

        <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Friends — {selected.size}/9
        </div>
        <ul className="mt-1 max-h-64 overflow-y-auto rounded-md border border-border">
          {friends.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-muted">
              No friends to add yet.
            </li>
          ) : (
            friends.map((f) => {
              const isSel = selected.has(f.user.id);
              return (
                <li key={f.user.id}>
                  <button
                    type="button"
                    onClick={() => toggle(f.user.id)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0",
                      isSel ? "bg-accent-soft" : "hover:bg-surface-hover",
                    )}
                  >
                    <Avatar
                      name={f.user.displayName || f.user.username}
                      color={f.user.avatarColor}
                      imageUrl={f.user.avatarUrl}
                      size="md"
                    />
                    <span className="flex-1 truncate text-sm">
                      {f.user.displayName || f.user.username}
                    </span>
                    {isSel ? (
                      <Check className="h-4 w-4 text-accent" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border" />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {error ? (
          <p className="mt-3 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || selected.size < 2}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
          >
            {submitting ? "Creating…" : "Create group"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
