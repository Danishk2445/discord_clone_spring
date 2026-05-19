"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, MessageCircle, MoreVertical, ShieldOff } from "lucide-react";
import { Dialog } from "./Dialog";
import { Avatar } from "./Avatar";
import {
  blockUser,
  getMyBlocks,
  openDmWithUser,
  unblockUser,
} from "@/lib/client-api";
import type { Presence, PublicUser, SelfUser } from "@/lib/types";

const STATUS_LABEL: Record<Presence, string> = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  offline: "Offline",
};

export function UserCard({
  open,
  onClose,
  user,
  selfId,
}: {
  open: boolean;
  onClose: () => void;
  user: PublicUser | SelfUser;
  selfId: string;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelf = user.id === selfId;

  useEffect(() => {
    if (!open || isSelf) return;
    let cancelled = false;
    void (async () => {
      const ids = await getMyBlocks();
      if (!cancelled) setIsBlocked(ids.includes(user.id));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user.id, isSelf]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const onMessage = async () => {
    if (busy || isSelf) return;
    setBusy(true);
    const dm = await openDmWithUser(user.id);
    setBusy(false);
    if (dm) {
      onClose();
      router.refresh();
      router.push(`/channels/me/${dm.id}`);
    }
  };

  const onBlock = async () => {
    if (busy) return;
    if (!confirm(`Block ${user.displayName || user.username}?`)) return;
    setBusy(true);
    await blockUser(user.id);
    setBusy(false);
    setMenuOpen(false);
    onClose();
    router.refresh();
  };

  const onUnblock = async () => {
    if (busy) return;
    setBusy(true);
    await unblockUser(user.id);
    setBusy(false);
    setMenuOpen(false);
    onClose();
    router.refresh();
  };

  return (
    <Dialog open={open} onClose={onClose} size="sm">
      <div
        className="h-24 w-full"
        style={{ background: user.avatarColor }}
      />
      <div className="relative px-5 pb-5">
        <div className="-mt-16 flex items-end justify-between">
          <Avatar
            name={user.displayName || user.username}
            color={user.avatarColor}
            imageUrl={user.avatarUrl}
            status={user.status}
            size="2xl"
            className="ring-[6px] ring-surface"
          />
          {!isSelf ? (
            <div className="relative mb-2" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="More"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-bg text-text-muted shadow ring-1 ring-border hover:text-text"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-10 z-10 w-44 overflow-hidden rounded-md border border-border bg-bg shadow-lg">
                  {isBlocked ? (
                    <MenuItem onClick={() => void onUnblock()}>
                      <ShieldOff className="h-4 w-4" />
                      <span>Unblock</span>
                    </MenuItem>
                  ) : (
                    <MenuItem danger onClick={() => void onBlock()}>
                      <Ban className="h-4 w-4" />
                      <span>Block</span>
                    </MenuItem>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-md bg-bg p-4">
          <div className="text-lg font-semibold text-text">
            {user.displayName || user.username}
          </div>
          <div className="text-xs text-text-muted">
            @{user.username}#{user.discriminator}
          </div>
          <div className="mt-2 text-xs text-text-muted">
            {STATUS_LABEL[user.status]}
          </div>
          {user.bio ? (
            <>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                About me
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text">
                {user.bio}
              </p>
            </>
          ) : null}

          {!isSelf && !isBlocked ? (
            <button
              type="button"
              onClick={() => void onMessage()}
              disabled={busy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
            >
              <MessageCircle className="h-4 w-4" />
              Send Message
            </button>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        danger
          ? "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-surface-hover"
          : "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-hover"
      }
    >
      {children}
    </button>
  );
}
