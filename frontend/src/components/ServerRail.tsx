"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Plus, MessageSquare } from "lucide-react";
import { cn } from "@/lib/cn";
import { API_BASE } from "@/lib/api-base";
import { useUnread } from "@/lib/useUnread";
import type { Server } from "@/lib/types";
import { CreateServerDialog } from "./CreateServerDialog";

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}

export function ServerRail({
  servers,
  selfId,
}: {
  servers: Server[];
  selfId: string;
}) {
  const pathname = usePathname();
  const onDM = pathname.startsWith("/channels/me");
  const activeServerId = pathname.match(/^\/channels\/([^/]+)/)?.[1];
  const [createOpen, setCreateOpen] = useState(false);
  const unread = useUnread(selfId);

  const { perServer, dmCount } = useMemo(() => {
    const perServer = new Map<string, number>();
    let dmCount = 0;
    for (const entry of Object.values(unread)) {
      if (entry.unreadCount <= 0) continue;
      if (entry.serverId) {
        perServer.set(
          entry.serverId,
          (perServer.get(entry.serverId) ?? 0) + entry.unreadCount,
        );
      } else {
        dmCount += entry.unreadCount;
      }
    }
    return { perServer, dmCount };
  }, [unread]);

  return (
    <>
      <nav className="flex h-full w-[72px] flex-col items-center gap-2 border-r border-border bg-bg py-3">
        <RailItem
          href="/channels/me"
          active={onDM}
          icon={<MessageSquare className="h-5 w-5" />}
          label="Direct Messages"
          badge={onDM ? 0 : dmCount}
        />

        <Divider />

        {servers.map((s) => {
          const active = s.id === activeServerId;
          const count = active ? 0 : perServer.get(s.id) ?? 0;
          return (
            <RailServer
              key={s.id}
              server={s}
              active={active}
              badge={count}
            />
          );
        })}

        <RailButton
          onClick={() => setCreateOpen(true)}
          icon={<Plus className="h-5 w-5" />}
          label="Add a server"
        />
        <RailItem
          href="#"
          icon={<Compass className="h-5 w-5" />}
          label="Explore"
          accent
        />
      </nav>
      <CreateServerDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}

function RailButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-accent transition-all duration-150 group-hover:rounded-[14px] group-hover:bg-accent group-hover:text-bg"
      >
        {icon}
      </button>
      <span className="pointer-events-none absolute left-[58px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
        {label}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="my-1 h-px w-8 bg-border" />;
}

function RailItem({
  href,
  active,
  icon,
  label,
  accent,
  badge = 0,
}: {
  href: string;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  accent?: boolean;
  badge?: number;
}) {
  return (
    <div className="group relative">
      <PillIndicator active={!!active} />
      <Link
        href={href}
        aria-label={label}
        className={cn(
          "flex h-12 w-12 items-center justify-center transition-all duration-150",
          "rounded-2xl group-hover:rounded-[14px]",
          active
            ? "rounded-[14px] bg-accent text-bg"
            : accent
              ? "bg-surface text-accent group-hover:bg-accent group-hover:text-bg"
              : "bg-surface text-text group-hover:bg-accent group-hover:text-bg",
        )}
      >
        {icon}
      </Link>
      <UnreadBadge count={badge} />
      <Tooltip label={label} />
    </div>
  );
}

function RailServer({
  server,
  active,
  badge,
}: {
  server: Server;
  active: boolean;
  badge: number;
}) {
  const icon = resolveImageUrl(server.iconUrl);
  return (
    <div className="group relative">
      <PillIndicator active={active} />
      <Link
        href={`/channels/${server.id}`}
        aria-label={server.name}
        className={cn(
          "flex h-12 w-12 items-center justify-center overflow-hidden text-sm font-semibold transition-all duration-150",
          "rounded-2xl group-hover:rounded-[14px]",
          active && "rounded-[14px]",
        )}
        style={
          icon
            ? undefined
            : {
                background: active ? server.accent : "var(--color-surface)",
                color: active ? "var(--color-bg)" : "var(--color-text)",
              }
        }
      >
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={icon}
            alt={server.name}
            className="h-full w-full object-cover"
          />
        ) : (
          server.short
        )}
      </Link>
      <UnreadBadge count={badge} />
      <Tooltip label={server.name} />
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} unread`}
      className="pointer-events-none absolute -bottom-0.5 -right-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[3px] border-bg bg-danger px-1 text-[10px] font-bold leading-none text-bg"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function PillIndicator({ active }: { active: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute -left-3 top-1/2 w-1 -translate-y-1/2 rounded-r-full bg-accent transition-all duration-150",
        active ? "h-8" : "h-0 group-hover:h-5",
      )}
    />
  );
}

function Tooltip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[58px] top-1/2 z-50 -translate-y-1/2 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100">
      {label}
    </span>
  );
}
