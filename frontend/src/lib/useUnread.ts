"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getUnread } from "./client-api";
import { subscribeRealtime } from "./realtime";
import type { UnreadMap } from "./types";

export function useUnread(selfId: string): UnreadMap {
  const [map, setMap] = useState<UnreadMap>({});
  const pathname = usePathname();

  // Initial fetch + refetch when navigating.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const fresh = await getUnread();
      if (!cancelled) setMap(fresh);
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Live increments from incoming messages.
  useEffect(() => {
    return subscribeRealtime((event) => {
      if (event.type !== "message") return;
      if (event.message.authorId === selfId) return;
      const channelId = event.message.channelId;
      const activeChannelId = activeIdFromPath(pathname);
      if (channelId === activeChannelId) return;
      const mentioned =
        event.message.mentions.includes(selfId) ||
        event.message.mentions.includes("@everyone") ||
        event.message.mentions.includes("@here");
      setMap((prev) => {
        const cur = prev[channelId] ?? {
          unreadCount: 0,
          mentionCount: 0,
          lastReadAt: 0,
        };
        return {
          ...prev,
          [channelId]: {
            ...cur,
            unreadCount: cur.unreadCount + 1,
            mentionCount: cur.mentionCount + (mentioned ? 1 : 0),
          },
        };
      });
    });
  }, [pathname, selfId]);

  // Clear active channel/DM when we land on it.
  useEffect(() => {
    const id = activeIdFromPath(pathname);
    if (!id) return;
    setMap((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      next[id] = { ...next[id], unreadCount: 0, mentionCount: 0 };
      return next;
    });
  }, [pathname]);

  return map;
}

function activeIdFromPath(pathname: string): string | null {
  // /channels/<serverId>/<channelId>
  // /channels/me/<dmId>
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "channels") return null;
  if (parts.length < 3) return null;
  return parts[2] ?? null;
}
