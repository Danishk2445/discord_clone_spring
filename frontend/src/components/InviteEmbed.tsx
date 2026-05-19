"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api-base";
import { acceptInvite, getInvite } from "@/lib/client-api";
import type { InvitePreview } from "@/lib/types";

type Entry = InvitePreview | null | "loading";

const previewCache = new Map<string, Entry>();
const subscribers = new Map<string, Set<() => void>>();

function notify(code: string) {
  for (const cb of subscribers.get(code) ?? []) cb();
}

async function ensureFetched(code: string) {
  if (previewCache.has(code)) return;
  previewCache.set(code, "loading");
  notify(code);
  const data = await getInvite(code);
  previewCache.set(code, data ?? null);
  notify(code);
}

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}

function formatEstablished(ts: number): string {
  return `Est. ${new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  })}`;
}

export function InviteEmbed({ code }: { code: string }) {
  const router = useRouter();
  const [, setTick] = useState(0);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const force = () => setTick((t) => t + 1);
    let set = subscribers.get(code);
    if (!set) {
      set = new Set();
      subscribers.set(code, set);
    }
    set.add(force);
    void ensureFetched(code);
    return () => {
      set!.delete(force);
      if (set!.size === 0) subscribers.delete(code);
    };
  }, [code]);

  const entry = previewCache.get(code);

  if (entry === undefined || entry === "loading") {
    return (
      <div className="mt-1 w-full max-w-md rounded-md border border-border bg-surface px-3 py-3 text-xs text-text-muted">
        Loading invite…
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="mt-1 w-full max-w-md rounded-md border border-border bg-surface px-3 py-3 text-xs text-text-muted">
        Invite invalid or expired.
      </div>
    );
  }

  const preview = entry;
  const icon = resolveImageUrl(preview.server.iconUrl);
  const banner = resolveImageUrl(preview.server.bannerUrl);

  const onJoin = async () => {
    setJoining(true);
    const result = await acceptInvite(code);
    setJoining(false);
    if (result) {
      previewCache.set(code, { ...preview, alreadyMember: true });
      notify(code);
      router.push(`/channels/${result.server.id}`);
      router.refresh();
    }
  };

  const onOpen = () => {
    router.push(`/channels/${preview.server.id}`);
  };

  return (
    <div className="mt-1 w-full max-w-md overflow-hidden rounded-md border border-border bg-surface">
      {banner ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={banner} alt="" className="h-24 w-full object-cover" />
      ) : null}
      <div className="px-3 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          You&apos;ve been invited to join a server
        </p>
        <div className="mt-2 flex items-center gap-3">
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt=""
              className="h-12 w-12 shrink-0 rounded-2xl object-cover"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-base font-bold text-bg"
              style={{ background: preview.server.accent }}
            >
              {preview.server.short}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">
              {preview.server.name}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-online" />
                {preview.onlineCount.toLocaleString()} Online
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-text-dim" />
                {preview.memberCount.toLocaleString()} Members
              </span>
              <span>{formatEstablished(preview.serverCreatedAt)}</span>
            </div>
          </div>
          {preview.alreadyMember ? (
            <button
              type="button"
              onClick={onOpen}
              className="shrink-0 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text hover:bg-surface-hover"
            >
              Joined
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onJoin()}
              disabled={joining}
              className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-bg hover:bg-accent-strong disabled:opacity-60"
            >
              {joining ? "Joining…" : "Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const INVITE_URL_RE = /\bhttps?:\/\/\S+\/invite\/([A-Za-z0-9_-]+)/g;

export function extractInviteCodes(content: string): string[] {
  const codes = new Set<string>();
  INVITE_URL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INVITE_URL_RE.exec(content)) !== null) codes.add(m[1]);
  return [...codes];
}
