"use client";

import { useEffect, useState } from "react";
import { subscribeRealtime } from "./realtime";
import type { Presence } from "./types";

const store = new Map<string, Presence>();
const listeners = new Set<(map: Map<string, Presence>) => void>();
let subscribed = false;

function ensureSubscribed() {
  if (subscribed) return;
  subscribed = true;
  subscribeRealtime((event) => {
    if (event.type !== "presence") return;
    store.set(event.userId, event.status);
    const snapshot = new Map(store);
    for (const l of listeners) l(snapshot);
  });
}

export function usePresence(): Map<string, Presence> {
  const [map, setMap] = useState<Map<string, Presence>>(() => new Map(store));
  useEffect(() => {
    ensureSubscribed();
    listeners.add(setMap);
    return () => {
      listeners.delete(setMap);
    };
  }, []);
  return map;
}

export function applyPresence<T extends { id: string; status: Presence }>(
  user: T,
  presenceMap: Map<string, Presence>,
): T {
  const override = presenceMap.get(user.id);
  if (!override) return user;
  return { ...user, status: override };
}
