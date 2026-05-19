"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  DoorOpen,
  FolderPlus,
  Settings as SettingsIcon,
  Trash2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { deleteServer, leaveServer } from "@/lib/client-api";
import type { Server } from "@/lib/types";
import { InviteDialog } from "./InviteDialog";
import { ServerSettingsDialog } from "./ServerSettingsDialog";

export function ServerHeaderMenu({
  server,
  isOwner,
  canManageServer,
  canManageChannels,
  canKick,
  canBan,
  onCreateCategory,
}: {
  server: Server;
  isOwner: boolean;
  canManageServer: boolean;
  canManageChannels: boolean;
  canKick: boolean;
  canBan: boolean;
  onCreateCategory: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const canOpenSettings = isOwner || canManageServer || canKick || canBan;

  const onLeave = async () => {
    if (!confirm(`Leave ${server.name}?`)) return;
    const ok = await leaveServer(server.id);
    if (ok) {
      router.replace("/channels/me");
      router.refresh();
    }
  };

  const onDelete = async () => {
    const phrase = `delete ${server.name}`;
    const input = prompt(
      `Deleting a server is permanent.\n\nType "${phrase}" to confirm:`,
    );
    if (input?.trim().toLowerCase() !== phrase.toLowerCase()) return;
    const ok = await deleteServer(server.id);
    if (ok) {
      router.replace("/channels/me");
      router.refresh();
    }
  };

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold transition-colors hover:bg-surface/50"
        >
          <span className="truncate">{server.name}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-muted transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        {open ? (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-2 right-2 top-12 z-40 overflow-hidden rounded-lg border border-border bg-surface shadow-2xl">
              <MenuItem
                icon={<UserPlus className="h-4 w-4" />}
                label="Invite People"
                onClick={() => {
                  setOpen(false);
                  setShowInvite(true);
                }}
                emphasis
              />
              {canOpenSettings ? (
                <MenuItem
                  icon={<SettingsIcon className="h-4 w-4" />}
                  label="Server Settings"
                  onClick={() => {
                    setOpen(false);
                    setShowSettings(true);
                  }}
                />
              ) : null}
              {isOwner || canManageChannels ? (
                <MenuItem
                  icon={<FolderPlus className="h-4 w-4" />}
                  label="Create Category"
                  onClick={() => {
                    setOpen(false);
                    onCreateCategory();
                  }}
                />
              ) : null}
              {isOwner ? (
                <MenuItem
                  icon={<Trash2 className="h-4 w-4" />}
                  label="Delete Server"
                  onClick={() => {
                    setOpen(false);
                    void onDelete();
                  }}
                  danger
                />
              ) : (
                <MenuItem
                  icon={<DoorOpen className="h-4 w-4" />}
                  label="Leave Server"
                  onClick={() => {
                    setOpen(false);
                    void onLeave();
                  }}
                  danger
                />
              )}
            </div>
          </>
        ) : null}
      </div>

      <InviteDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        serverId={server.id}
      />
      <ServerSettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        serverId={server.id}
        server={server}
        canManageServer={canManageServer || isOwner}
        canKick={canKick || isOwner}
        canBan={canBan || isOwner}
      />
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  emphasis,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  emphasis?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors",
        danger
          ? "text-danger hover:bg-danger/10"
          : emphasis
            ? "text-accent hover:bg-accent-soft"
            : "text-text hover:bg-surface-hover",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
