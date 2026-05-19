"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff } from "lucide-react";
import { declineIncomingCall, subscribePendingCalls } from "@/lib/realtime";
import { getUser } from "@/lib/client-api";
import type { PendingDmCall, PublicUser } from "@/lib/types";
import { Avatar } from "./Avatar";

export function IncomingCallNotifier() {
  const [calls, setCalls] = useState<PendingDmCall[]>([]);
  const [callers, setCallers] = useState<Record<string, PublicUser | null>>({});
  const router = useRouter();

  useEffect(() => subscribePendingCalls(setCalls), []);

  useEffect(() => {
    const missing = calls
      .map((c) => c.callerId)
      .filter((id) => !(id in callers));
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(missing.map((id) => getUser(id))).then((results) => {
      if (cancelled) return;
      setCallers((prev) => {
        const next = { ...prev };
        results.forEach((u, i) => {
          next[missing[i]] = u;
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [calls, callers]);

  if (calls.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex flex-col gap-2">
      {calls.map((call) => {
        const caller = callers[call.callerId];
        const name =
          caller?.displayName ?? caller?.username ?? "Someone";
        return (
          <div
            key={call.dmId}
            className="pointer-events-auto flex w-80 items-center gap-3 rounded-lg border border-border bg-bg p-3 shadow-xl"
          >
            <Avatar
              name={name}
              color={caller?.avatarColor ?? "#5865f2"}
              imageUrl={caller?.avatarUrl ?? null}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="text-xs text-text-muted">Incoming voice call…</div>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Decline"
                title="Decline"
                onClick={() => declineIncomingCall(call.dmId)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-danger text-bg transition-opacity hover:opacity-90"
              >
                <PhoneOff className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Accept"
                title="Accept"
                onClick={() => {
                  router.push(`/channels/me/${call.dmId}?call=1`);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-online text-bg transition-opacity hover:opacity-90"
              >
                <Phone className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
