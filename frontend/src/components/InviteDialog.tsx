"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, RefreshCcw, Search } from "lucide-react";
import {
  createInvite,
  listFriends,
  listMembers,
  openDmWithUser,
  sendDmMessage,
} from "@/lib/client-api";
import type { Friend } from "@/lib/types";
import { Dialog } from "./Dialog";
import { Avatar } from "./Avatar";

type InviteState = "idle" | "sending" | "sent" | "error";

export function InviteDialog({
  open,
  onClose,
  serverId,
}: {
  open: boolean;
  onClose: () => void;
  serverId: string;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [inviteStatus, setInviteStatus] = useState<Record<string, InviteState>>({});

  const refresh = async () => {
    setLoading(true);
    const invite = await createInvite(serverId);
    setLoading(false);
    if (invite) setCode(invite.code);
  };

  useEffect(() => {
    if (!open) {
      setCode(null);
      setCopied(false);
      setSearch("");
      setInviteStatus({});
      setFriends([]);
      setMemberIds(new Set());
      return;
    }
    void refresh();
    let cancelled = false;
    void (async () => {
      const [fs, ms] = await Promise.all([
        listFriends("all"),
        listMembers(serverId),
      ]);
      if (cancelled) return;
      setFriends(fs);
      setMemberIds(new Set(ms.map((m) => m.user.id)));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serverId]);

  const inviteUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${code}`
    : "";

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => {
      const display = (f.user.displayName || "").toLowerCase();
      const uname = f.user.username.toLowerCase();
      return display.includes(q) || uname.includes(q);
    });
  }, [friends, search]);

  const onInvite = async (userId: string) => {
    if (!inviteUrl) return;
    setInviteStatus((s) => ({ ...s, [userId]: "sending" }));
    const dm = await openDmWithUser(userId);
    if (!dm) {
      setInviteStatus((s) => ({ ...s, [userId]: "error" }));
      return;
    }
    const msg = await sendDmMessage(dm.id, { content: inviteUrl });
    setInviteStatus((s) => ({
      ...s,
      [userId]: msg ? "sent" : "error",
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} title="Invite friends" size="md">
      <div className="space-y-4 px-5 py-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for friends"
            className="w-full rounded-md border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-accent/60"
          />
        </div>

        <ul className="max-h-64 overflow-y-auto rounded-md border border-border">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-text-muted">
              {friends.length === 0 ? "No friends to invite yet." : "No matches."}
            </li>
          ) : (
            filtered.map((f) => {
              const state = inviteStatus[f.user.id] ?? "idle";
              const inServer = memberIds.has(f.user.id);
              return (
                <li
                  key={f.user.id}
                  className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                >
                  <Avatar
                    name={f.user.displayName || f.user.username}
                    color={f.user.avatarColor}
                    imageUrl={f.user.avatarUrl}
                    status={f.user.status}
                    size="md"
                  />
                  <span className="flex-1 truncate text-sm">
                    {f.user.displayName || f.user.username}
                  </span>
                  {inServer ? (
                    <span className="text-xs text-text-muted">Joined</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void onInvite(f.user.id)}
                      disabled={
                        !inviteUrl || state === "sending" || state === "sent"
                      }
                      className={
                        state === "sent"
                          ? "rounded-md border border-border px-3 py-1 text-xs font-semibold text-text-muted"
                          : "rounded-md border border-accent px-3 py-1 text-xs font-semibold text-accent hover:bg-accent hover:text-bg disabled:opacity-40"
                      }
                    >
                      {state === "sending"
                        ? "Sending…"
                        : state === "sent"
                          ? "Sent"
                          : state === "error"
                            ? "Retry"
                            : "Invite"}
                    </button>
                  )}
                </li>
              );
            })
          )}
        </ul>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Or share an invite link
          </p>
          <div className="mt-1 flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
            <input
              readOnly
              value={loading ? "Generating…" : inviteUrl}
              className="flex-1 truncate bg-transparent text-sm text-text outline-none"
            />
            <button
              type="button"
              onClick={onCopy}
              disabled={!code}
              className="rounded-md bg-accent px-3 py-1 text-xs font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
            >
              <span className="inline-flex items-center gap-1">
                <Copy className="h-3.5 w-3.5" />
                {copied ? "Copied!" : "Copy"}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="mt-2 inline-flex items-center gap-2 text-xs text-text-muted hover:text-accent"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Generate new link
          </button>
        </div>
      </div>
    </Dialog>
  );
}
