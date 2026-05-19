"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Hash, Trash2, Volume2 } from "lucide-react";
import { deleteChannel, updateChannel } from "@/lib/client-api";
import type { Channel } from "@/lib/types";
import { Dialog } from "./Dialog";

export function EditChannelDialog({
  open,
  onClose,
  channel,
  serverId,
}: {
  open: boolean;
  onClose: () => void;
  channel: Channel;
  serverId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  const valid = sanitized.length >= 2 && sanitized.length <= 32;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    const updated = await updateChannel(channel.id, {
      name: sanitized,
      topic,
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
    if (!confirm(`Delete #${channel.name}? This cannot be undone.`)) return;
    const ok = await deleteChannel(channel.id);
    if (ok) {
      onClose();
      router.replace(`/channels/${serverId}`);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`Edit #${channel.name}`}>
      <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Channel name
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 focus-within:border-accent/60">
            {channel.kind === "voice" ? (
              <Volume2 className="h-4 w-4 text-text-muted" />
            ) : (
              <Hash className="h-4 w-4 text-text-muted" />
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
        </label>

        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Topic
          </div>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What's this channel about?"
            maxLength={200}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60"
          />
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
            Delete channel
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
