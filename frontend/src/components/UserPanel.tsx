"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Headphones, Mic, Settings } from "lucide-react";
import { updateProfile } from "@/lib/client-api";
import { Avatar } from "./Avatar";
import type { Presence, SelfUser } from "@/lib/types";

const STATUS_OPTIONS: { value: Presence; label: string; dot: string }[] = [
  { value: "online",  label: "Online",         dot: "bg-online" },
  { value: "idle",    label: "Idle",           dot: "bg-idle" },
  { value: "dnd",     label: "Do Not Disturb", dot: "bg-dnd" },
  { value: "offline", label: "Invisible",      dot: "bg-text-dim" },
];

export function UserPanel({ user }: { user: SelfUser }) {
  const router = useRouter();
  const [status, setStatus] = useState<Presence>(user.status);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatus(user.status);
  }, [user.status]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const changeStatus = async (next: Presence) => {
    setOpen(false);
    if (next === status) return;
    const prev = status;
    setStatus(next);
    const updated = await updateProfile({ status: next });
    if (!updated) {
      setStatus(prev);
      return;
    }
    router.refresh();
  };

  return (
    <div className="relative flex items-center gap-2 border-t border-border bg-bg px-2 py-2" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-surface-hover"
      >
        <Avatar
          name={user.displayName || user.username}
          color={user.avatarColor}
          imageUrl={user.avatarUrl}
          status={status}
          size="md"
        />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium">
            {user.displayName || user.username}
          </div>
          <div className="truncate text-[11px] text-text-muted">
            {STATUS_OPTIONS.find((s) => s.value === status)?.label ?? "Online"}
          </div>
        </div>
      </button>

      {open ? (
        <div className="absolute bottom-full left-2 mb-1 w-56 overflow-hidden rounded-md border border-border bg-bg shadow-lg">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Set status
          </div>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => void changeStatus(s.value)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <span className="flex-1">{s.label}</span>
              {status === s.value ? (
                <span className="text-[10px] text-accent">●</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <IconButton label="Mute">
        <Mic className="h-4 w-4" />
      </IconButton>
      <IconButton label="Deafen">
        <Headphones className="h-4 w-4" />
      </IconButton>
      <Link
        href="/settings"
        aria-label="User Settings"
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-accent"
      >
        <Settings className="h-4 w-4" />
      </Link>
    </div>
  );
}

function IconButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-hover hover:text-accent"
    >
      {children}
    </button>
  );
}
