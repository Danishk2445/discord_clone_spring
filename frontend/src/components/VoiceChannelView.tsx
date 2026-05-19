"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
} from "lucide-react";
import { useVoiceChannel } from "@/lib/useVoiceChannel";
import { subscribeVoiceState } from "@/lib/realtime";
import { getUser } from "@/lib/client-api";
import { cn } from "@/lib/cn";
import type {
  NotificationLevel,
  PublicUser,
  SelfUser,
  VoiceMember,
} from "@/lib/types";
import { Avatar } from "./Avatar";
import { ChatView } from "./ChatView";
import { MembersPanel } from "./MembersPanel";

type UserMap = Record<string, PublicUser | SelfUser>;

export function VoiceChannelView({
  serverId,
  channelId,
  title,
  subtitle,
  composerPlaceholder,
  users,
  selfId,
  mentionables,
  blockedUserIds,
  canPin,
  canDeleteOthers,
  canMentionEveryone,
  initialNotificationLevel,
}: {
  serverId: string;
  channelId: string;
  title: string;
  subtitle?: string;
  composerPlaceholder: string;
  users: UserMap;
  selfId: string;
  mentionables: (PublicUser | SelfUser)[];
  blockedUserIds: string[];
  canPin: boolean;
  canDeleteOthers: boolean;
  canMentionEveryone: boolean;
  initialNotificationLevel: NotificationLevel;
}) {
  const [showMembers, setShowMembers] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const { state, join, leave, toggleMute, toggleDeafen } = useVoiceChannel(
    channelId,
    selfId,
  );
  const [observerMembers, setObserverMembers] = useState<VoiceMember[]>([]);
  const [userMap, setUserMap] = useState<UserMap>(users);

  useEffect(() => {
    setUserMap(users);
  }, [users]);

  useEffect(() => {
    if (state.joined) return;
    const unsub = subscribeVoiceState((states) => {
      setObserverMembers(states[channelId] ?? []);
    });
    return unsub;
  }, [channelId, state.joined]);

  const members: VoiceMember[] = useMemo(() => {
    if (state.joined) return Array.from(state.members.values());
    return observerMembers;
  }, [state.joined, state.members, observerMembers]);

  useEffect(() => {
    const missing = members
      .map((m) => m.userId)
      .filter((id) => !userMap[id]);
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(missing.map((id) => getUser(id))).then((results) => {
      if (cancelled) return;
      setUserMap((prev) => {
        const next = { ...prev };
        for (const u of results) if (u) next[u.id] = u;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [members, userMap]);

  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
          <Volume2 className="h-5 w-5 text-text-muted" />
          <span className="font-semibold">{title}</span>
          {subtitle ? (
            <>
              <span className="mx-1 h-4 w-px bg-border" />
              <span className="truncate text-sm text-text-muted">
                {subtitle}
              </span>
            </>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setChatOpen((v) => !v)}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                chatOpen
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-hover hover:text-text",
              )}
            >
              {chatOpen ? "Hide chat" : "Show chat"}
            </button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col bg-surface">
          <div className="flex-1 overflow-y-auto p-6">
            {members.length === 0 ? (
              <div className="mx-auto mt-16 max-w-md text-center text-text-muted">
                <Volume2 className="mx-auto mb-3 h-10 w-10 opacity-50" />
                <p className="text-sm">No one is here yet.</p>
                <p className="mt-1 text-xs">
                  {state.joined
                    ? "You're connected. Invite someone to join."
                    : "Click Join Voice to start the call."}
                </p>
              </div>
            ) : (
              <div className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {members.map((m) => (
                  <ParticipantTile
                    key={m.userId}
                    member={m}
                    user={userMap[m.userId]}
                    speaking={
                      state.joined && state.speakingUserIds.has(m.userId)
                    }
                    isSelf={m.userId === selfId}
                  />
                ))}
              </div>
            )}
          </div>

          <VoiceControls
            joined={state.joined}
            joining={state.joining}
            muted={state.muted}
            deafened={state.deafened}
            error={state.error}
            channelName={title}
            onJoin={() => void join()}
            onLeave={leave}
            onToggleMute={toggleMute}
            onToggleDeafen={toggleDeafen}
          />
        </div>

        {chatOpen ? (
          <div className="flex h-72 shrink-0 flex-col border-t border-border">
            <ChatView
              channelId={channelId}
              kind="channel"
              title={title}
              icon="voice"
              composerPlaceholder={composerPlaceholder}
              users={userMap}
              backfillMissingUsers
              selfId={selfId}
              mentionables={mentionables}
              blockedUserIds={blockedUserIds}
              membersOpen={showMembers}
              onToggleMembers={() => setShowMembers((v) => !v)}
              canPin={canPin}
              canDeleteOthers={canDeleteOthers}
              canMentionEveryone={canMentionEveryone}
              initialNotificationLevel={initialNotificationLevel}
              showHeaderActions={false}
            />
          </div>
        ) : null}
      </div>
      {showMembers ? <MembersPanel serverId={serverId} selfId={selfId} /> : null}
    </div>
  );
}

function ParticipantTile({
  member,
  user,
  speaking,
  isSelf,
}: {
  member: VoiceMember;
  user: PublicUser | SelfUser | undefined;
  speaking: boolean;
  isSelf: boolean;
}) {
  const name = user?.displayName || user?.username || member.userId.slice(0, 6);
  const speakingNow = speaking || member.speaking;
  return (
    <div
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border-2 bg-bg p-3 transition-colors",
        speakingNow && !member.muted
          ? "border-online shadow-[0_0_0_3px_rgba(34,197,94,0.15)]"
          : "border-transparent",
      )}
    >
      <Avatar
        name={name}
        color={user?.avatarColor ?? "#5865f2"}
        imageUrl={user?.avatarUrl ?? null}
        size="xl"
      />
      <div className="flex items-center gap-1 text-sm font-medium">
        <span className="max-w-[10rem] truncate">{name}</span>
        {isSelf ? (
          <span className="text-xs text-text-muted">(you)</span>
        ) : null}
      </div>
      <div className="absolute right-2 top-2 flex gap-1">
        {member.muted ? (
          <span className="rounded-full bg-bg/80 p-1 text-danger">
            <MicOff className="h-3.5 w-3.5" />
          </span>
        ) : null}
        {member.deafened ? (
          <span className="rounded-full bg-bg/80 p-1 text-danger">
            <HeadphoneOff className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function VoiceControls({
  joined,
  joining,
  muted,
  deafened,
  error,
  channelName,
  onJoin,
  onLeave,
  onToggleMute,
  onToggleDeafen,
}: {
  joined: boolean;
  joining: boolean;
  muted: boolean;
  deafened: boolean;
  error: string | null;
  channelName: string;
  onJoin: () => void;
  onLeave: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
}) {
  return (
    <div className="shrink-0 border-t border-border bg-bg px-4 py-3">
      {error ? (
        <div className="mb-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
          {error === "NotAllowedError" ||
          error === "Permission denied" ||
          error.toLowerCase().includes("permission")
            ? "Microphone access was denied. Please allow it in your browser."
            : error === "joined_elsewhere"
              ? "You joined this channel from another tab or device."
              : `Voice error: ${error}`}
        </div>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm">
          {joined ? (
            <span className="text-online">
              Voice connected — {channelName}
            </span>
          ) : (
            <span className="text-text-muted">Not connected</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {joined ? (
            <>
              <ControlButton
                label={muted ? "Unmute" : "Mute"}
                active={muted}
                onClick={onToggleMute}
              >
                {muted ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </ControlButton>
              <ControlButton
                label={deafened ? "Undeafen" : "Deafen"}
                active={deafened}
                onClick={onToggleDeafen}
              >
                {deafened ? (
                  <HeadphoneOff className="h-4 w-4" />
                ) : (
                  <Headphones className="h-4 w-4" />
                )}
              </ControlButton>
              <button
                type="button"
                onClick={onLeave}
                className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
              >
                <PhoneOff className="h-4 w-4" />
                Disconnect
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onJoin}
              disabled={joining}
              className="rounded-md bg-online px-4 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {joining ? "Joining…" : "Join Voice"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-danger/15 text-danger hover:bg-danger/25"
          : "bg-surface-hover text-text hover:bg-surface-hover/70",
      )}
    >
      {children}
    </button>
  );
}
