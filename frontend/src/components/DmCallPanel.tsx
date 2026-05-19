"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Headphones,
  HeadphoneOff,
  Mic,
  MicOff,
  PhoneOff,
} from "lucide-react";
import { getUser } from "@/lib/client-api";
import { subscribeVoiceState } from "@/lib/realtime";
import { useVoiceChannel } from "@/lib/useVoiceChannel";
import { cn } from "@/lib/cn";
import type {
  PublicUser,
  SelfUser,
  VoiceMember,
} from "@/lib/types";
import { Avatar } from "./Avatar";

type UserMap = Record<string, PublicUser | SelfUser>;

export function DmCallPanel({
  dmId,
  selfId,
  users,
  onClose,
}: {
  dmId: string;
  selfId: string;
  users: UserMap;
  onClose: () => void;
}) {
  const { state, join, leave, toggleMute, toggleDeafen } = useVoiceChannel(
    dmId,
    selfId,
  );
  const [observerMembers, setObserverMembers] = useState<VoiceMember[]>([]);
  const [fetchedUsers, setFetchedUsers] = useState<UserMap>({});
  const userMap = useMemo<UserMap>(
    () => ({ ...fetchedUsers, ...users }),
    [fetchedUsers, users],
  );
  const autoJoinedRef = useRef(false);

  useEffect(() => {
    if (autoJoinedRef.current) return;
    autoJoinedRef.current = true;
    void join();
  }, [join]);

  useEffect(() => {
    if (state.joined) return;
    const unsub = subscribeVoiceState((states) => {
      setObserverMembers(states[dmId] ?? []);
    });
    return unsub;
  }, [dmId, state.joined]);

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
      setFetchedUsers((prev) => {
        const next = { ...prev };
        for (const u of results) if (u) next[u.id] = u;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [members, userMap]);

  const handleEnd = () => {
    leave();
    onClose();
  };

  const errorText = state.error
    ? state.error === "NotAllowedError" ||
      state.error.toLowerCase().includes("permission")
      ? "Microphone access was denied. Please allow it in your browser."
      : state.error === "joined_elsewhere"
        ? "You joined this call from another tab or device."
        : state.error === "forbidden"
          ? "You can't join this call."
          : `Voice error: ${state.error}`
    : null;

  return (
    <div className="shrink-0 border-b border-border bg-surface px-4 py-3">
      {errorText ? (
        <div className="mb-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
          {errorText}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex -space-x-2">
            {members.length === 0 ? (
              <span className="text-xs text-text-muted">
                {state.joining ? "Connecting…" : "Starting call…"}
              </span>
            ) : (
              members.slice(0, 6).map((m) => {
                const u = userMap[m.userId];
                const name =
                  u?.displayName ?? u?.username ?? m.userId.slice(0, 6);
                const speaking =
                  state.joined && state.speakingUserIds.has(m.userId);
                return (
                  <div
                    key={m.userId}
                    className={cn(
                      "rounded-full ring-2 transition-colors",
                      speaking && !m.muted
                        ? "ring-online"
                        : "ring-surface",
                    )}
                    title={name + (m.userId === selfId ? " (you)" : "")}
                  >
                    <Avatar
                      name={name}
                      color={u?.avatarColor ?? "#5865f2"}
                      imageUrl={u?.avatarUrl ?? null}
                      size="md"
                    />
                  </div>
                );
              })
            )}
          </div>
          <div className="min-w-0 text-sm">
            {state.joined ? (
              <span className="text-online">
                Voice connected · {members.length}{" "}
                {members.length === 1 ? "person" : "people"}
              </span>
            ) : state.joining ? (
              <span className="text-text-muted">Connecting…</span>
            ) : (
              <span className="text-text-muted">Not connected</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CallButton
            label={state.muted ? "Unmute" : "Mute"}
            active={state.muted}
            onClick={toggleMute}
            disabled={!state.joined}
          >
            {state.muted ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </CallButton>
          <CallButton
            label={state.deafened ? "Undeafen" : "Deafen"}
            active={state.deafened}
            onClick={toggleDeafen}
            disabled={!state.joined}
          >
            {state.deafened ? (
              <HeadphoneOff className="h-4 w-4" />
            ) : (
              <Headphones className="h-4 w-4" />
            )}
          </CallButton>
          <button
            type="button"
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-md bg-danger px-3 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-90"
          >
            <PhoneOff className="h-4 w-4" />
            End
          </button>
        </div>
      </div>
    </div>
  );
}

function CallButton({
  label,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-danger/15 text-danger hover:bg-danger/25"
          : "bg-surface-hover text-text hover:bg-surface-hover/70",
        disabled && "opacity-50",
      )}
    >
      {children}
    </button>
  );
}
