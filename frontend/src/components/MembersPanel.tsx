"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown } from "lucide-react";
import { listMembers, listRoles } from "@/lib/client-api";
import { usePresence } from "@/lib/usePresence";
import type { Member, Presence, PublicUser, Role } from "@/lib/types";
import { Avatar } from "./Avatar";
import { UserCard } from "./UserCard";

const PRESENCE_ORDER: Record<Presence, number> = {
  online: 0,
  idle: 1,
  dnd: 2,
  offline: 3,
};

export function MembersPanel({
  serverId,
  selfId,
}: {
  serverId: string;
  selfId: string;
}) {
  const [rawMembers, setRawMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [cardUser, setCardUser] = useState<PublicUser | null>(null);
  const presence = usePresence();
  const members = useMemo<Member[]>(() => {
    if (presence.size === 0) return rawMembers;
    return rawMembers.map((m) => {
      const live = presence.get(m.user.id);
      if (!live) return m;
      return { ...m, user: { ...m.user, status: live } };
    });
  }, [rawMembers, presence]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [m, r] = await Promise.all([
        listMembers(serverId),
        listRoles(serverId),
      ]);
      if (!cancelled) {
        setRawMembers(m);
        setRoles(r);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  const onlineMembers = members.filter(
    (m) => m.user.status !== "offline",
  );
  const offlineMembers = members.filter(
    (m) => m.user.status === "offline",
  );
  onlineMembers.sort(
    (a, b) =>
      PRESENCE_ORDER[a.user.status as Presence] -
        PRESENCE_ORDER[b.user.status as Presence] ||
      (a.user.displayName || a.user.username).localeCompare(
        b.user.displayName || b.user.username,
      ),
  );

  const topRole = (m: Member) => {
    for (const r of roles) {
      if (m.roleIds.includes(r.id) && !r.isEveryone) return r;
    }
    return null;
  };

  return (
    <aside className="hidden h-full w-60 shrink-0 border-l border-border bg-bg lg:flex lg:flex-col">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-4">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Members — {members.length}
        </span>
      </header>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {onlineMembers.length > 0 ? (
          <Section label={`Online — ${onlineMembers.length}`}>
            {onlineMembers.map((m) => (
              <MemberRow
                key={m.user.id}
                member={m}
                role={topRole(m)}
                onOpen={() => setCardUser(m.user)}
              />
            ))}
          </Section>
        ) : null}
        {offlineMembers.length > 0 ? (
          <Section label={`Offline — ${offlineMembers.length}`}>
            {offlineMembers.map((m) => (
              <MemberRow
                key={m.user.id}
                member={m}
                role={topRole(m)}
                dim
                onOpen={() => setCardUser(m.user)}
              />
            ))}
          </Section>
        ) : null}
      </div>
      {cardUser ? (
        <UserCard
          open
          onClose={() => setCardUser(null)}
          user={cardUser}
          selfId={selfId}
        />
      ) : null}
    </aside>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4">
      <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </div>
      <ul>{children}</ul>
    </section>
  );
}

function MemberRow({
  member,
  role,
  dim,
  onOpen,
}: {
  member: Member;
  role: Role | null;
  dim?: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-hover ${dim ? "opacity-50" : ""}`}
      >
        <Avatar
          name={member.user.displayName || member.user.username}
          color={member.user.avatarColor}
          imageUrl={member.user.avatarUrl}
          status={member.user.status}
          size="md"
        />
        <span
          className="min-w-0 flex-1 truncate text-sm"
          style={role ? { color: role.color } : undefined}
        >
          {member.user.displayName || member.user.username}
        </span>
        {member.isOwner ? (
          <Crown className="h-3.5 w-3.5 text-accent" />
        ) : null}
      </button>
    </li>
  );
}
