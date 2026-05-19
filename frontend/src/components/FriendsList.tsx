"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  MessageCircle,
  MoreVertical,
  Search,
  ShieldOff,
  UserPlus,
  UserX,
  UsersRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import {
  acceptFriend,
  listFriends,
  openDmWithUser,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "@/lib/client-api";
import { usePresence } from "@/lib/usePresence";
import type { Friend, Presence, PublicUser, SelfUser } from "@/lib/types";
import { Avatar } from "./Avatar";
import { UserCard } from "./UserCard";

type Tab = "online" | "all" | "pending" | "blocked" | "add";

const TABS: { id: Tab; label: string }[] = [
  { id: "online",  label: "Online" },
  { id: "all",     label: "All" },
  { id: "pending", label: "Pending" },
  { id: "blocked", label: "Blocked" },
  { id: "add",     label: "Add Friend" },
];

export function FriendsList({
  initialFriends,
  selfId,
}: {
  initialFriends: Friend[];
  selfId: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("online");
  const [query, setQuery] = useState("");
  const [rawFriends, setRawFriends] = useState<Friend[]>(initialFriends);
  const presence = usePresence();
  const friends = useMemo<Friend[]>(() => {
    if (presence.size === 0) return rawFriends;
    return rawFriends.map((f) => {
      const live = presence.get(f.user.id);
      if (!live) return f;
      return { ...f, user: { ...f.user, status: live } };
    });
  }, [rawFriends, presence]);
  const setFriends = setRawFriends;
  const [busy, setBusy] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [cardUser, setCardUser] = useState<PublicUser | SelfUser | null>(null);

  const reload = async (t: Tab) => {
    if (t === "add") return;
    const fresh = await listFriends(t);
    setFriends(fresh);
  };

  useEffect(() => {
    if (tab === "add") return;
    let cancelled = false;
    void (async () => {
      const fresh = await listFriends(tab);
      if (!cancelled) setFriends(fresh);
    })();
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const onAccept = async (userId: string) => {
    setBusy(userId);
    await acceptFriend(userId);
    await reload(tab);
    setBusy(null);
    router.refresh();
  };
  const onRemove = async (userId: string) => {
    setBusy(userId);
    await removeFriend(userId);
    await reload(tab);
    setBusy(null);
    router.refresh();
  };
  const onMessage = async (userId: string) => {
    if (busy === userId) return;
    setBusy(userId);
    const dm = await openDmWithUser(userId);
    setBusy(null);
    if (dm) {
      router.refresh();
      router.push(`/channels/me/${dm.id}`);
    }
  };
  const onUnblock = async (userId: string) => {
    setBusy(userId);
    await unblockUser(userId);
    await reload(tab);
    setBusy(null);
    router.refresh();
  };

  const filtered = friends.filter((f) =>
    !query
      ? true
      : (f.user.displayName || f.user.username)
          .toLowerCase()
          .includes(query.toLowerCase()),
  );

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center gap-4 border-b border-border px-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UsersRound className="h-5 w-5 text-text-muted" />
          Friends
        </div>
        <div className="h-5 w-px bg-border" />
        <nav className="flex items-center gap-1">
          {TABS.map((t) => {
            const active = t.id === tab;
            const isAdd = t.id === "add";
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm transition-colors",
                  isAdd
                    ? active
                      ? "bg-accent-strong text-bg"
                      : "bg-accent text-bg hover:bg-accent-strong"
                    : active
                      ? "bg-surface-hover text-text"
                      : "text-text-muted hover:bg-surface-hover hover:text-text",
                )}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      {tab === "add" ? (
        <AddFriendPanel onSent={() => reload(tab)} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-6 pt-4">
          <div className="relative mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-lg bg-surface px-3 py-2 pr-9 text-sm text-text outline-none placeholder:text-text-muted focus:ring-1 focus:ring-accent/40"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>

          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {labelFor(tab)} — {filtered.length}
          </div>

          <ul className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="py-12 text-center text-sm text-text-muted">
                No one here yet.
              </li>
            ) : (
              filtered.map((f) => {
                const isFriend = tab !== "pending" && tab !== "blocked";
                return (
                  <li
                    key={f.user.id}
                    onClick={
                      isFriend ? () => void onMessage(f.user.id) : undefined
                    }
                    onKeyDown={
                      isFriend
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              void onMessage(f.user.id);
                            }
                          }
                        : undefined
                    }
                    role={isFriend ? "button" : undefined}
                    tabIndex={isFriend ? 0 : undefined}
                    aria-busy={busy === f.user.id || undefined}
                    className={cn(
                      "group flex items-center gap-3 border-t border-border py-3 transition-colors first:border-t-0 hover:bg-surface/50",
                      isFriend && "cursor-pointer outline-none focus:bg-surface/50",
                    )}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCardUser(f.user);
                      }}
                      aria-label={`Open profile for ${f.user.displayName || f.user.username}`}
                      className="shrink-0 rounded-full outline-none focus:ring-2 focus:ring-accent/60"
                    >
                      <Avatar
                        name={f.user.displayName || f.user.username}
                        color={f.user.avatarColor}
                        imageUrl={f.user.avatarUrl}
                        status={f.user.status}
                        size="lg"
                      />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardUser(f.user);
                        }}
                        className="truncate text-left text-sm font-semibold text-text hover:underline"
                      >
                        {f.user.displayName || f.user.username}
                      </button>
                      <div className="truncate text-xs text-text-muted">
                        {tab === "pending"
                          ? f.pendingDirection === "incoming"
                            ? "Incoming Friend Request"
                            : "Outgoing Friend Request"
                          : statusLabel(f.user.status)}
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 opacity-60 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {tab === "pending" ? (
                        <>
                          {f.pendingDirection === "incoming" ? (
                            <ActionButton
                              label="Accept"
                              onClick={() => onAccept(f.user.id)}
                              disabled={busy === f.user.id}
                            >
                              <Check className="h-4 w-4 text-accent" />
                            </ActionButton>
                          ) : null}
                          <ActionButton
                            label={
                              f.pendingDirection === "incoming"
                                ? "Decline"
                                : "Cancel"
                            }
                            onClick={() => onRemove(f.user.id)}
                            disabled={busy === f.user.id}
                          >
                            <X className="h-4 w-4 text-danger" />
                          </ActionButton>
                        </>
                      ) : tab === "blocked" ? (
                        <ActionButton
                          label="Unblock"
                          onClick={() => onUnblock(f.user.id)}
                          disabled={busy === f.user.id}
                        >
                          <ShieldOff className="h-4 w-4" />
                        </ActionButton>
                      ) : (
                        <>
                          <ActionButton
                            label="Message"
                            onClick={() => onMessage(f.user.id)}
                            disabled={busy === f.user.id}
                          >
                            <MessageCircle className="h-4 w-4" />
                          </ActionButton>
                          <FriendMoreMenu
                            open={menuOpenFor === f.user.id}
                            onToggle={() =>
                              setMenuOpenFor((cur) =>
                                cur === f.user.id ? null : f.user.id,
                              )
                            }
                            onClose={() => setMenuOpenFor(null)}
                            onRemove={() => {
                              setMenuOpenFor(null);
                              void onRemove(f.user.id);
                            }}
                          />
                        </>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
      {cardUser ? (
        <UserCard
          open
          onClose={() => setCardUser(null)}
          user={cardUser}
          selfId={selfId}
        />
      ) : null}
    </div>
  );
}

function FriendMoreMenu({
  open,
  onToggle,
  onClose,
  onRemove,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <ActionButton label="More" onClick={onToggle}>
        <MoreVertical className="h-4 w-4" />
      </ActionButton>
      {open ? (
        <div className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-md border border-border bg-bg shadow-lg">
          <button
            type="button"
            onClick={onRemove}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-surface-hover"
          >
            <UserX className="h-4 w-4" />
            <span>Remove Friend</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text-muted transition-colors hover:bg-surface-hover hover:text-accent disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function AddFriendPanel({ onSent }: { onSent: () => void }) {
  const [value, setValue] = useState("");
  const [message, setMessage] = useState<
    { kind: "ok" | "err"; text: string } | null
  >(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    setSubmitting(true);
    setMessage(null);
    const result = await sendFriendRequest(v);
    setSubmitting(false);
    if (result.ok) {
      setMessage({
        kind: "ok",
        text: result.accepted
          ? `You are now friends with ${v}.`
          : `Sent a friend request to ${v}.`,
      });
      setValue("");
      onSent();
    } else {
      setMessage({ kind: "err", text: errorLabel(result.error) });
    }
  };

  return (
    <div className="px-6 pt-6">
      <h2 className="flex items-center gap-2 text-base font-semibold uppercase tracking-wide">
        <UserPlus className="h-4 w-4 text-accent" />
        Add Friend
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        You can add friends by username, or with a tag like <code>aria#0021</code>.
      </p>
      <form
        onSubmit={onSubmit}
        className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-surface p-2 focus-within:border-accent/40"
      >
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage(null);
          }}
          placeholder="Enter a username or username#0000"
          className="flex-1 bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-text-muted"
        />
        <button
          type="submit"
          disabled={!value.trim() || submitting}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
        >
          {submitting ? "Sending…" : "Send Friend Request"}
        </button>
      </form>
      {message ? (
        <p
          className={cn(
            "mt-3 rounded-md px-3 py-2 text-xs",
            message.kind === "ok"
              ? "bg-accent-soft text-accent"
              : "bg-danger/10 text-danger",
          )}
        >
          {message.text}
        </p>
      ) : null}
    </div>
  );
}

function labelFor(tab: Tab) {
  switch (tab) {
    case "online":  return "Online";
    case "all":     return "All Friends";
    case "pending": return "Pending";
    case "blocked": return "Blocked";
    case "add":     return "Add Friend";
  }
}

function statusLabel(s: Presence) {
  switch (s) {
    case "online":  return "Online";
    case "idle":    return "Idle";
    case "dnd":     return "Do Not Disturb";
    case "offline": return "Offline";
  }
}

function errorLabel(err: string) {
  switch (err) {
    case "username_required":     return "Enter a username.";
    case "user_not_found":        return "No user found with that name.";
    case "cannot_friend_self":    return "You can't friend yourself.";
    case "already_friends":       return "You're already friends.";
    case "already_requested":     return "A request is already pending.";
    default:                      return "Could not send request.";
  }
}
