"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  HeadphoneOff,
  Hash,
  MicOff,
  Pencil,
  Plus,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useUnread } from "@/lib/useUnread";
import { subscribeVoiceState } from "@/lib/realtime";
import { getUser } from "@/lib/client-api";
import type {
  Category,
  Channel,
  PublicUser,
  SelfUser,
  Server,
  VoiceMember,
  VoiceStateMap,
} from "@/lib/types";
import { Avatar } from "./Avatar";
import { UserPanel } from "./UserPanel";
import { ServerHeaderMenu } from "./ServerHeaderMenu";
import { CreateCategoryDialog } from "./CreateCategoryDialog";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { EditChannelDialog } from "./EditChannelDialog";

export function ChannelSidebar({
  server,
  categories,
  channels,
  me,
  isOwner,
  canManageServer,
  canManageChannels,
  canKick,
  canBan,
}: {
  server: Server;
  categories: Category[];
  channels: Channel[];
  me: SelfUser;
  isOwner: boolean;
  canManageServer: boolean;
  canManageChannels: boolean;
  canKick: boolean;
  canBan: boolean;
}) {
  const canEditChannels = isOwner || canManageChannels;
  const pathname = usePathname();
  const activeChannelId = pathname.split("/")[3];
  const [createIn, setCreateIn] = useState<Category | null>(null);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const unread = useUnread(me.id);
  const [voiceStates, setVoiceStates] = useState<VoiceStateMap>({});
  const [userCache, setUserCache] = useState<Record<string, PublicUser>>({
    [me.id]: me,
  });

  useEffect(() => subscribeVoiceState(setVoiceStates), []);

  useEffect(() => {
    const seen = new Set<string>();
    const missing: string[] = [];
    for (const list of Object.values(voiceStates)) {
      for (const m of list) {
        if (seen.has(m.userId)) continue;
        seen.add(m.userId);
        if (!userCache[m.userId]) missing.push(m.userId);
      }
    }
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(missing.map((id) => getUser(id))).then((results) => {
      if (cancelled) return;
      setUserCache((prev) => {
        const next = { ...prev };
        for (const u of results) if (u) next[u.id] = u;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [voiceStates, userCache]);

  const toggleCollapsed = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-bg">
      <header className="shrink-0 border-b border-border">
        <ServerHeaderMenu
          server={server}
          isOwner={isOwner}
          canManageServer={canManageServer}
          canManageChannels={canManageChannels}
          canKick={canKick}
          canBan={canBan}
          onCreateCategory={() => setCreatingCategory(true)}
        />
      </header>

      <div className="flex-1 overflow-y-auto py-3">
        {categories.map((cat) => {
          const items = channels.filter((c) => c.categoryId === cat.id);
          const isCollapsed = collapsed.has(cat.id);
          return (
            <section key={cat.id} className="group/cat mb-3">
              <div className="flex items-center px-3 py-1">
                <button
                  type="button"
                  onClick={() => toggleCollapsed(cat.id)}
                  aria-expanded={!isCollapsed}
                  className="flex flex-1 items-center gap-1 text-xs font-semibold tracking-wide text-text-muted transition-colors hover:text-text"
                >
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                  />
                  {cat.name}
                </button>
                {canEditChannels ? (
                  <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover/cat:opacity-100">
                    <button
                      type="button"
                      onClick={() => setEditingCategory(cat)}
                      aria-label={`Edit ${cat.name}`}
                      className="hover:text-accent"
                    >
                      <Pencil className="h-3.5 w-3.5 text-text-muted" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateIn(cat)}
                      aria-label={`Create channel in ${cat.name}`}
                      className="hover:text-accent"
                    >
                      <Plus className="h-3.5 w-3.5 text-text-muted" />
                    </button>
                  </div>
                ) : null}
              </div>

              {items.length === 0 || isCollapsed ? null : (
                <ul className="mt-1 px-2">
                  {items.map((ch) => {
                    const active = ch.id === activeChannelId;
                    const Icon = ch.kind === "voice" ? Volume2 : Hash;
                    const entry = unread[ch.id];
                    const showUnread = !active && (entry?.unreadCount ?? 0) > 0;
                    const mentions = !active ? entry?.mentionCount ?? 0 : 0;
                    const occupants =
                      ch.kind === "voice" ? voiceStates[ch.id] ?? [] : [];
                    return (
                      <li key={ch.id} className="group/ch">
                        <div className="relative">
                          <Link
                            href={`/channels/${server.id}/${ch.id}`}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 pr-7 text-sm transition-colors",
                              active
                                ? "bg-accent-soft text-accent"
                                : showUnread
                                  ? "text-text hover:bg-surface-hover"
                                  : "text-text-muted hover:bg-surface-hover hover:text-text",
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className={cn("truncate", showUnread && "font-semibold")}>
                              {ch.name}
                            </span>
                            {mentions > 0 ? (
                              <span className="ml-auto rounded-full bg-danger px-1.5 text-[10px] font-bold leading-4 text-bg">
                                {mentions > 99 ? "99+" : mentions}
                              </span>
                            ) : showUnread ? (
                              <span className="ml-auto h-2 w-2 rounded-full bg-text" />
                            ) : null}
                          </Link>
                          {canEditChannels ? (
                            <button
                              type="button"
                              onClick={() => setEditing(ch)}
                              aria-label={`Edit #${ch.name}`}
                              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 transition-opacity hover:text-accent group-hover/ch:opacity-100"
                            >
                              <Pencil className="h-3.5 w-3.5 text-text-muted" />
                            </button>
                          ) : null}
                        </div>
                        {occupants.length > 0 ? (
                          <ul className="mb-1 ml-7 space-y-0.5">
                            {occupants.map((m) => (
                              <VoiceOccupantRow
                                key={m.userId}
                                member={m}
                                user={userCache[m.userId]}
                              />
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <UserPanel user={me} />

      {createIn ? (
        <CreateChannelDialog
          open
          onClose={() => setCreateIn(null)}
          serverId={server.id}
          categoryId={createIn.id}
          categoryName={createIn.name}
        />
      ) : null}
      {editing ? (
        <EditChannelDialog
          open
          onClose={() => setEditing(null)}
          channel={editing}
          serverId={server.id}
        />
      ) : null}
      {creatingCategory ? (
        <CreateCategoryDialog
          open
          onClose={() => setCreatingCategory(false)}
          serverId={server.id}
        />
      ) : null}
      {editingCategory ? (
        <EditCategoryDialog
          open
          onClose={() => setEditingCategory(null)}
          category={editingCategory}
          channelCount={
            channels.filter((c) => c.categoryId === editingCategory.id).length
          }
        />
      ) : null}
    </aside>
  );
}

function VoiceOccupantRow({
  member,
  user,
}: {
  member: VoiceMember;
  user: PublicUser | undefined;
}) {
  const name = user?.displayName || user?.username || member.userId.slice(0, 6);
  const isSpeaking = member.speaking && !member.muted;
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs",
        isSpeaking ? "text-online" : "text-text-muted",
      )}
    >
      <div
        className={cn(
          "rounded-full",
          isSpeaking && "ring-2 ring-online",
        )}
      >
        <Avatar
          name={name}
          color={user?.avatarColor ?? "#5865f2"}
          imageUrl={user?.avatarUrl ?? null}
          size="sm"
          className="!h-4 !w-4 !text-[8px]"
        />
      </div>
      <span className="truncate">{name}</span>
      {member.muted ? <MicOff className="h-3 w-3 text-danger" /> : null}
      {member.deafened ? (
        <HeadphoneOff className="h-3 w-3 text-danger" />
      ) : null}
    </li>
  );
}
