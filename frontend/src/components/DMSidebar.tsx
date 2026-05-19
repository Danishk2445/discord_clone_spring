"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Search, UserRound, Users, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUnread } from "@/lib/useUnread";
import { leaveGroupDm, listFriends, openDmWithUser } from "@/lib/client-api";
import type { DirectMessage, Friend, PublicUser, SelfUser } from "@/lib/types";
import { Avatar } from "./Avatar";
import { UserPanel } from "./UserPanel";
import { CreateGroupDmDialog } from "./CreateGroupDmDialog";

const HIDDEN_DMS_KEY = "dc:hiddenDms";

function loadHidden(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(HIDDEN_DMS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr)
      ? new Set(arr.filter((x): x is string => typeof x === "string"))
      : new Set();
  } catch {
    return new Set();
  }
}

function saveHidden(s: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIDDEN_DMS_KEY, JSON.stringify([...s]));
  } catch {
    // ignore
  }
}

export function DMSidebar({
  me,
  dms,
  participants,
}: {
  me: SelfUser;
  dms: DirectMessage[];
  participants: Record<string, PublicUser | SelfUser>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const onFriends = pathname === "/channels/me";
  const activeDmId = pathname.startsWith("/channels/me/")
    ? pathname.split("/")[3]
    : null;
  const unread = useUnread(me.id);
  const [groupOpen, setGroupOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setHidden(loadHidden());
  }, []);

  useEffect(() => {
    if (activeDmId && hidden.has(activeDmId)) {
      const next = new Set(hidden);
      next.delete(activeDmId);
      setHidden(next);
      saveHidden(next);
    }
  }, [activeDmId, hidden]);

  const visibleDms = useMemo(
    () => dms.filter((d) => !hidden.has(d.id)),
    [dms, hidden],
  );

  const onCloseDm = async (e: MouseEvent, dm: DirectMessage) => {
    e.preventDefault();
    e.stopPropagation();
    if (dm.isGroup) {
      const ok = await leaveGroupDm(dm.id);
      if (ok) {
        if (activeDmId === dm.id) router.push("/channels/me");
        router.refresh();
      }
      return;
    }
    const next = new Set(hidden);
    next.add(dm.id);
    setHidden(next);
    saveHidden(next);
    if (activeDmId === dm.id) router.push("/channels/me");
  };

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-bg">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <button
          type="button"
          onClick={() => setFindOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-md bg-surface px-2 py-1 text-left text-xs text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Find or start a conversation</span>
        </button>
      </header>

      <div className="px-2 pt-3">
        <Link
          href="/channels/me"
          className={cn(
            "flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
            onFriends
              ? "bg-accent-soft text-accent"
              : "text-text-muted hover:bg-surface-hover hover:text-text",
          )}
        >
          <UserRound className="h-5 w-5" />
          <span className="font-medium">Friends</span>
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between px-4 pb-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Direct Messages
        </span>
        <button
          type="button"
          aria-label="Create group DM"
          onClick={() => setGroupOpen(true)}
          className="text-text-muted transition-colors hover:text-text"
        >
          +
        </button>
      </div>

      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {visibleDms.map((dm) => {
          const active = dm.id === activeDmId;
          const partner = dm.isGroup
            ? null
            : participants[dm.participantIds.find((p) => p !== me.id) ?? ""];
          const name = dm.isGroup
            ? (dm.groupName ?? "Group")
            : (partner?.displayName ?? partner?.username ?? "Unknown");
          const entry = unread[dm.id];
          const showUnread = !active && (entry?.unreadCount ?? 0) > 0;
          const unreadCount = !active ? entry?.unreadCount ?? 0 : 0;
          return (
            <li key={dm.id}>
              <Link
                href={`/channels/me/${dm.id}`}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors",
                  active
                    ? "bg-accent-soft text-accent"
                    : showUnread
                      ? "text-text hover:bg-surface-hover"
                      : "text-text-muted hover:bg-surface-hover hover:text-text",
                )}
              >
                {dm.isGroup ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted">
                    <Users className="h-4 w-4" />
                  </div>
                ) : partner ? (
                  <Avatar
                    name={partner.displayName || partner.username}
                    color={partner.avatarColor}
                    imageUrl={partner.avatarUrl}
                    status={partner.status}
                    size="md"
                  />
                ) : null}
                <span className={cn(
                  "min-w-0 flex-1 truncate text-sm",
                  showUnread ? "font-semibold" : "font-medium",
                )}>
                  {name}
                </span>
                {unreadCount > 0 ? (
                  <span className="ml-auto rounded-full bg-danger px-1.5 text-[10px] font-bold leading-4 text-bg">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={dm.isGroup ? "Leave group" : "Close DM"}
                    onClick={(e) => void onCloseDm(e, dm)}
                    className="ml-auto rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <UserPanel user={me} />
      {groupOpen ? (
        <CreateGroupDmDialog
          open
          onClose={() => setGroupOpen(false)}
          selfId={me.id}
        />
      ) : null}
      {findOpen ? (
        <FindConversationDialog
          dms={dms}
          participants={participants}
          selfId={me.id}
          onClose={() => setFindOpen(false)}
          onUnhide={(dmId) => {
            if (!hidden.has(dmId)) return;
            const next = new Set(hidden);
            next.delete(dmId);
            setHidden(next);
            saveHidden(next);
          }}
        />
      ) : null}
    </aside>
  );
}

function FindConversationDialog({
  dms,
  participants,
  selfId,
  onClose,
  onUnhide,
}: {
  dms: DirectMessage[];
  participants: Record<string, PublicUser | SelfUser>;
  selfId: string;
  onClose: () => void;
  onUnhide: (dmId: string) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [opening, setOpening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    void (async () => {
      const fs = await listFriends("all");
      if (!cancelled) setFriends(fs);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  type Row =
    | { kind: "dm"; dm: DirectMessage; label: string; sub: string }
    | { kind: "friend"; user: PublicUser; label: string; sub: string };

  const rows = useMemo<Row[]>(() => {
    const q = query.trim().toLowerCase();
    const dmRows: Row[] = dms.map((dm) => {
      if (dm.isGroup) {
        const label = dm.groupName ?? "Group";
        const memberNames = dm.participantIds
          .filter((id) => id !== selfId)
          .map((id) => {
            const u = participants[id];
            return u?.displayName ?? u?.username ?? "Unknown";
          })
          .join(", ");
        return { kind: "dm", dm, label, sub: memberNames };
      }
      const partnerId = dm.participantIds.find((id) => id !== selfId) ?? "";
      const partner = participants[partnerId];
      const label = partner?.displayName ?? partner?.username ?? "Unknown";
      const sub = partner?.username ? `@${partner.username}` : "";
      return { kind: "dm", dm, label, sub };
    });
    const friendsWithoutDirectDm = friends.filter((f) => {
      return !dms.some(
        (d) => !d.isGroup && d.participantIds.includes(f.user.id),
      );
    });
    const friendRows: Row[] = friendsWithoutDirectDm.map((f) => ({
      kind: "friend",
      user: f.user,
      label: f.user.displayName || f.user.username,
      sub: `@${f.user.username}`,
    }));
    const all = [...dmRows, ...friendRows];
    if (!q) return all.slice(0, 20);
    return all
      .filter(
        (r) =>
          r.label.toLowerCase().includes(q) ||
          r.sub.toLowerCase().includes(q),
      )
      .slice(0, 20);
  }, [dms, friends, participants, query, selfId]);

  const onPick = async (row: Row) => {
    if (opening) return;
    if (row.kind === "dm") {
      onUnhide(row.dm.id);
      router.push(`/channels/me/${row.dm.id}`);
      onClose();
      return;
    }
    setOpening(true);
    const dm = await openDmWithUser(row.user.id);
    setOpening(false);
    if (dm) {
      onUnhide(dm.id);
      router.refresh();
      router.push(`/channels/me/${dm.id}`);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/60 px-4 pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-lg border border-border bg-bg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border p-2">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && rows[0]) {
                e.preventDefault();
                void onPick(rows[0]);
              }
            }}
            placeholder="Where would you like to go?"
            className="w-full rounded bg-surface px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {rows.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-text-muted">
              No matches. Add a friend to start a new conversation.
            </div>
          ) : (
            rows.map((row) => {
              const key =
                row.kind === "dm" ? `dm-${row.dm.id}` : `f-${row.user.id}`;
              const icon =
                row.kind === "dm" && row.dm.isGroup ? (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface text-text-muted">
                    <Users className="h-4 w-4" />
                  </div>
                ) : row.kind === "dm" ? (
                  (() => {
                    const partnerId =
                      row.dm.participantIds.find((id) => id !== selfId) ?? "";
                    const partner = participants[partnerId];
                    return partner ? (
                      <Avatar
                        name={partner.displayName || partner.username}
                        color={partner.avatarColor}
                        imageUrl={partner.avatarUrl}
                        status={partner.status}
                        size="md"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-surface" />
                    );
                  })()
                ) : (
                  <Avatar
                    name={row.user.displayName || row.user.username}
                    color={row.user.avatarColor}
                    imageUrl={row.user.avatarUrl}
                    status={row.user.status}
                    size="md"
                  />
                );
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => void onPick(row)}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-surface"
                >
                  {icon}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">
                      {row.label}
                    </div>
                    {row.sub ? (
                      <div className="truncate text-xs text-text-muted">
                        {row.sub}
                      </div>
                    ) : null}
                  </div>
                  {row.kind === "friend" ? (
                    <span className="text-[10px] uppercase tracking-wider text-text-muted">
                      Start
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
