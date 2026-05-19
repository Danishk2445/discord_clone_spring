"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Hash, Volume2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { createChannel } from "@/lib/client-api";
import { Dialog } from "./Dialog";

export function CreateChannelDialog({
  open,
  onClose,
  serverId,
  categoryId,
  categoryName,
}: {
  open: boolean;
  onClose: () => void;
  serverId: string;
  categoryId: string;
  categoryName: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"text" | "voice">("text");
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
    const channel = await createChannel(serverId, {
      name: sanitized,
      categoryId,
      kind,
    });
    setSubmitting(false);
    if (!channel) {
      setError("Could not create channel.");
      return;
    }
    setName("");
    onClose();
    router.push(`/channels/${serverId}/${channel.id}`);
    router.refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Create Channel">
      <form onSubmit={onSubmit} className="space-y-5 px-5 py-5">
        <p className="text-[11px] uppercase tracking-wider text-text-muted">
          in <span className="text-text">{categoryName}</span>
        </p>

        <div>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Channel Type
          </div>
          <div className="space-y-2">
            <KindOption
              active={kind === "text"}
              onClick={() => setKind("text")}
              icon={<Hash className="h-4 w-4" />}
              title="Text"
              description="Send messages, images, GIFs, and more"
            />
            <KindOption
              active={kind === "voice"}
              onClick={() => setKind("voice")}
              icon={<Volume2 className="h-4 w-4" />}
              title="Voice"
              description="Hang out together with voice and video"
            />
          </div>
        </div>

        <label className="block">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Channel name
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 focus-within:border-accent/60">
            {kind === "voice" ? (
              <Volume2 className="h-4 w-4 text-text-muted" />
            ) : (
              <Hash className="h-4 w-4 text-text-muted" />
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="new-channel"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          {name && !valid ? (
            <p className="mt-1 text-[11px] text-danger">
              Names must be 2–32 characters using a–z, 0–9, or “-”.
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
            {submitting ? "Creating…" : "Create Channel"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function KindOption({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border bg-bg px-3 py-2 text-left transition-colors",
        active
          ? "border-accent/60 bg-accent-soft"
          : "border-border hover:border-text-muted",
      )}
    >
      <span className="text-text-muted">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-[11px] text-text-muted">{description}</span>
      </span>
    </button>
  );
}
