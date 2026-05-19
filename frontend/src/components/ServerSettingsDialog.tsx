"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Crown,
  ImagePlus,
  Plus,
  Trash2,
  UserMinus,
  UserX,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { API_BASE } from "@/lib/api-base";
import {
  assignRole,
  banMember,
  createRole,
  deleteRole,
  deleteServer,
  kickMember,
  listBans,
  listMembers,
  listRoles,
  unassignRole,
  unbanMember,
  updateRole,
  updateServer,
  uploadFile,
} from "@/lib/client-api";
import {
  PERM,
  PERMISSION_META,
  type Member,
  type Role,
  type Server,
  type ServerBan,
} from "@/lib/types";
import { Avatar } from "./Avatar";
import { Dialog } from "./Dialog";

type Tab = "overview" | "roles" | "members" | "bans";

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}

export function ServerSettingsDialog({
  open,
  onClose,
  serverId,
  server,
  canManageServer,
  canKick,
  canBan,
}: {
  open: boolean;
  onClose: () => void;
  serverId: string;
  server: Server;
  canManageServer: boolean;
  canKick: boolean;
  canBan: boolean;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [bans, setBans] = useState<ServerBan[]>([]);

  const refresh = async () => {
    const tasks: Array<Promise<unknown>> = [
      listRoles(serverId).then(setRoles),
      listMembers(serverId).then(setMembers),
    ];
    if (canBan) tasks.push(listBans(serverId).then(setBans));
    await Promise.all(tasks);
  };

  useEffect(() => {
    if (!open) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, serverId]);

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <div className="flex h-[600px] max-h-[85vh]">
        <nav className="flex w-44 shrink-0 flex-col gap-1 border-r border-border bg-bg p-3">
          <SidebarItem
            label="Overview"
            active={tab === "overview"}
            onClick={() => setTab("overview")}
          />
          <SidebarItem
            label="Roles"
            active={tab === "roles"}
            onClick={() => setTab("roles")}
          />
          <SidebarItem
            label="Members"
            active={tab === "members"}
            onClick={() => setTab("members")}
          />
          {canBan ? (
            <SidebarItem
              label="Bans"
              active={tab === "bans"}
              onClick={() => setTab("bans")}
            />
          ) : null}
        </nav>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {tab === "overview" ? (
            <OverviewTab
              server={server}
              canManage={canManageServer}
              onClose={onClose}
            />
          ) : null}
          {tab === "roles" ? (
            <RolesTab roles={roles} onChange={refresh} serverId={serverId} />
          ) : null}
          {tab === "members" ? (
            <MembersTab
              roles={roles}
              members={members}
              onChange={refresh}
              serverId={serverId}
              canKick={canKick}
              canBan={canBan}
            />
          ) : null}
          {tab === "bans" && canBan ? (
            <BansTab
              bans={bans}
              onChange={refresh}
              serverId={serverId}
            />
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-accent-soft text-accent"
          : "text-text-muted hover:bg-surface-hover hover:text-text",
      )}
    >
      {label}
    </button>
  );
}

function OverviewTab({
  server,
  canManage,
  onClose,
}: {
  server: Server;
  canManage: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(server.name);
  const [accent, setAccent] = useState(server.accent);
  const [iconUrl, setIconUrl] = useState<string | null>(server.iconUrl);
  const [bannerUrl, setBannerUrl] = useState<string | null>(server.bannerUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"icon" | "banner" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const dirty =
    name.trim() !== server.name ||
    accent !== server.accent ||
    iconUrl !== server.iconUrl ||
    bannerUrl !== server.bannerUrl;

  const onPickFile = async (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: "icon" | "banner",
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file.");
      return;
    }
    setError(null);
    setUploading(kind);
    const att = await uploadFile(file);
    setUploading(null);
    if (!att) {
      setError("Upload failed.");
      return;
    }
    if (kind === "icon") setIconUrl(att.url);
    else setBannerUrl(att.url);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const next = await updateServer(server.id, {
      name: name.trim(),
      accent,
      iconUrl,
      bannerUrl,
    });
    setSaving(false);
    if (!next) {
      setError("Save failed.");
      return;
    }
    router.refresh();
  };

  const onDelete = async () => {
    const phrase = `delete ${server.name}`;
    const input = prompt(
      `Deleting a server is permanent.\n\nType "${phrase}" to confirm:`,
    );
    if (input?.trim().toLowerCase() !== phrase.toLowerCase()) return;
    const ok = await deleteServer(server.id);
    if (!ok) {
      setError("Delete failed.");
      return;
    }
    onClose();
    router.replace("/channels/me");
    router.refresh();
  };

  const iconPreview = resolveImageUrl(iconUrl);
  const bannerPreview = resolveImageUrl(bannerUrl);

  return (
    <div className="px-6 py-5">
      <h2 className="text-base font-semibold">Server Overview</h2>

      {!canManage ? (
        <p className="mt-1 text-xs text-text-muted">
          You need the Manage Server permission to edit these settings.
        </p>
      ) : null}

      <div className="mt-5 space-y-5">
        <div className="flex items-start gap-5">
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Server icon
            </div>
            <button
              type="button"
              disabled={!canManage || uploading === "icon"}
              onClick={() => iconInput.current?.click()}
              className={cn(
                "relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-dashed border-border bg-bg text-xs text-text-muted transition-colors",
                canManage && "hover:border-accent hover:text-accent",
                !canManage && "opacity-60",
              )}
              style={
                iconPreview
                  ? undefined
                  : { background: accent, color: "var(--color-bg)" }
              }
            >
              {iconPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={iconPreview}
                  alt="Server icon"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-base font-bold">
                  {server.short}
                </span>
              )}
              {canManage ? (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-1 text-[10px] font-medium text-white">
                  <ImagePlus className="h-3 w-3" />
                  {uploading === "icon" ? "Uploading…" : "Change"}
                </span>
              ) : null}
            </button>
            {iconUrl && canManage ? (
              <button
                type="button"
                onClick={() => setIconUrl(null)}
                className="mt-2 text-[11px] text-text-muted hover:text-danger"
              >
                Remove icon
              </button>
            ) : null}
            <input
              ref={iconInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void onPickFile(e, "icon")}
            />
          </div>

          <div className="flex-1 space-y-4">
            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Server name
              </div>
              <input
                value={name}
                disabled={!canManage}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60 disabled:opacity-60"
              />
            </label>

            <label className="block">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                Accent color
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accent}
                  disabled={!canManage}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-border bg-bg disabled:opacity-60"
                />
                <span className="font-mono text-xs text-text-muted">
                  {accent}
                </span>
              </div>
            </label>
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Server banner
          </div>
          <button
            type="button"
            disabled={!canManage || uploading === "banner"}
            onClick={() => bannerInput.current?.click()}
            className={cn(
              "relative flex h-28 w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-bg text-xs text-text-muted transition-colors",
              canManage && "hover:border-accent hover:text-accent",
              !canManage && "opacity-60",
            )}
          >
            {bannerPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={bannerPreview}
                alt="Server banner"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex items-center gap-2">
                <ImagePlus className="h-4 w-4" />
                {uploading === "banner" ? "Uploading…" : "Upload banner"}
              </span>
            )}
          </button>
          {bannerUrl && canManage ? (
            <button
              type="button"
              onClick={() => setBannerUrl(null)}
              className="mt-2 text-[11px] text-text-muted hover:text-danger"
            >
              Remove banner
            </button>
          ) : null}
          <input
            ref={bannerInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPickFile(e, "banner")}
          />
        </div>

        {error ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        ) : null}

        {canManage ? (
          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onSave}
              disabled={!dirty || saving || !!uploading}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        ) : null}
      </div>

      {canManage ? (
        <div className="mt-8 rounded-lg border border-danger/40 bg-danger/5 p-4">
          <h3 className="text-sm font-semibold text-danger">Danger zone</h3>
          <p className="mt-1 text-xs text-text-muted">
            Deleting this server removes all channels, messages, and members.
            This cannot be undone.
          </p>
          <button
            type="button"
            onClick={onDelete}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-danger px-3 py-2 text-xs font-semibold text-bg hover:opacity-90"
          >
            <Trash2 className="h-4 w-4" />
            Delete server
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RolesTab({
  roles,
  onChange,
  serverId,
}: {
  roles: Role[];
  onChange: () => Promise<void>;
  serverId: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = roles.find((r) => r.id === selectedId) ?? roles[0];
  const [busy, setBusy] = useState(false);

  const onCreate = async () => {
    setBusy(true);
    const r = await createRole(serverId, { name: "New Role" });
    setBusy(false);
    if (r) {
      await onChange();
      setSelectedId(r.id);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex w-56 shrink-0 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Roles — {roles.length}
          </span>
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="rounded-md p-1 text-text-muted hover:bg-surface-hover hover:text-accent disabled:opacity-40"
            aria-label="Create role"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 py-2">
          {roles.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                  selected?.id === r.id
                    ? "bg-surface-hover text-text"
                    : "text-text-muted hover:bg-surface-hover hover:text-text",
                )}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: r.color }}
                />
                <span className="truncate">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {selected ? (
          <RoleEditor
            key={selected.id}
            role={selected}
            onChange={onChange}
            serverId={serverId}
          />
        ) : (
          <div className="p-6 text-sm text-text-muted">No role selected.</div>
        )}
      </div>
    </div>
  );
}

function RoleEditor({
  role,
  onChange,
  serverId,
}: {
  role: Role;
  onChange: () => Promise<void>;
  serverId: string;
}) {
  const [name, setName] = useState(role.name);
  const [color, setColor] = useState(role.color);
  const [permissions, setPermissions] = useState(role.permissions);
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== role.name ||
    color !== role.color ||
    permissions !== role.permissions;

  const togglePerm = (bit: number) =>
    setPermissions((p) => (p & bit ? p & ~bit : p | bit));

  const onSave = async () => {
    setSaving(true);
    await updateRole(serverId, role.id, {
      name: name.trim() || role.name,
      color,
      permissions,
    });
    setSaving(false);
    await onChange();
  };

  const onDelete = async () => {
    if (!confirm(`Delete role "${role.name}"?`)) return;
    await deleteRole(serverId, role.id);
    await onChange();
  };

  return (
    <div className="space-y-6 px-6 py-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Edit role</h2>
        {role.isEveryone ? (
          <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Default
          </span>
        ) : null}
      </div>

      <label className="block">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Role name
        </div>
        <input
          value={name}
          disabled={role.isEveryone}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-accent/60 disabled:opacity-60"
        />
      </label>

      <label className="block">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Role color
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            disabled={role.isEveryone}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-border bg-bg disabled:opacity-60"
          />
          <span className="font-mono text-xs text-text-muted">{color}</span>
        </div>
      </label>

      <div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Permissions
        </div>
        <ul className="space-y-2">
          {PERMISSION_META.map((p) => {
            const bit = PERM[p.key];
            const on = (permissions & bit) !== 0;
            return (
              <li
                key={p.key}
                className="flex items-center justify-between rounded-lg border border-border bg-bg px-3 py-2"
              >
                <div className="min-w-0 pr-4">
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-[11px] text-text-muted">
                    {p.description}
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => togglePerm(bit)}
                  className={cn(
                    "relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors",
                    on ? "bg-accent" : "bg-[#2a2d2c]",
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      on ? "translate-x-[22px]" : "translate-x-1",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        {role.isEveryone ? (
          <span className="text-xs text-text-muted">
            The default role cannot be deleted.
          </span>
        ) : (
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" />
            Delete role
          </button>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function MembersTab({
  members,
  roles,
  onChange,
  serverId,
  canKick,
  canBan,
}: {
  members: Member[];
  roles: Role[];
  onChange: () => Promise<void>;
  serverId: string;
  canKick: boolean;
  canBan: boolean;
}) {
  const assignableRoles = roles.filter((r) => !r.isEveryone);

  const onToggleRole = async (
    member: Member,
    roleId: string,
    currentlyHas: boolean,
  ) => {
    if (currentlyHas) {
      await unassignRole(serverId, member.user.id, roleId);
    } else {
      await assignRole(serverId, member.user.id, roleId);
    }
    await onChange();
  };

  const onKick = async (member: Member) => {
    if (
      !confirm(
        `Kick ${member.user.displayName || member.user.username}? They can rejoin with a new invite.`,
      )
    )
      return;
    await kickMember(serverId, member.user.id);
    await onChange();
  };

  const onBan = async (member: Member) => {
    const reason = prompt(
      `Ban ${member.user.displayName || member.user.username}?\nOptional reason:`,
      "",
    );
    if (reason === null) return;
    await banMember(serverId, member.user.id, reason || undefined);
    await onChange();
  };

  return (
    <div className="px-6 py-5">
      <h2 className="text-base font-semibold">
        Members — {members.length}
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Assign roles to control what each member can do.
      </p>

      <ul className="mt-5 space-y-2">
        {members.map((m) => (
          <li
            key={m.user.id}
            className="rounded-lg border border-border bg-bg p-3"
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={m.user.displayName || m.user.username}
                color={m.user.avatarColor}
                imageUrl={m.user.avatarUrl}
                status={m.user.status}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-semibold">
                  {m.user.displayName || m.user.username}
                  {m.isOwner ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-accent">
                      <Crown className="h-3 w-3" />
                      Owner
                    </span>
                  ) : null}
                </div>
                <div className="truncate text-[11px] text-text-muted">
                  #{m.user.discriminator}
                </div>
              </div>
              {!m.isOwner && (canKick || canBan) ? (
                <div className="flex shrink-0 items-center gap-1">
                  {canKick ? (
                    <button
                      type="button"
                      onClick={() => onKick(m)}
                      title="Kick"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                      Kick
                    </button>
                  ) : null}
                  {canBan ? (
                    <button
                      type="button"
                      onClick={() => onBan(m)}
                      title="Ban"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-text-muted hover:bg-danger/10 hover:text-danger"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Ban
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!m.isOwner && assignableRoles.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                {assignableRoles.map((r) => {
                  const has = m.roleIds.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => onToggleRole(m, r.id, has)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                        has
                          ? "border-transparent text-text"
                          : "border-border text-text-muted hover:text-text",
                      )}
                      style={
                        has ? { background: `${r.color}33` } : undefined
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: r.color }}
                      />
                      {r.name}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BansTab({
  bans,
  onChange,
  serverId,
}: {
  bans: ServerBan[];
  onChange: () => Promise<void>;
  serverId: string;
}) {
  const onUnban = async (ban: ServerBan) => {
    if (
      !confirm(
        `Unban ${ban.user.displayName || ban.user.username}? They will be able to rejoin via invite.`,
      )
    )
      return;
    await unbanMember(serverId, ban.user.id);
    await onChange();
  };

  return (
    <div className="px-6 py-5">
      <h2 className="text-base font-semibold">Bans — {bans.length}</h2>
      <p className="mt-1 text-xs text-text-muted">
        Banned users are blocked from rejoining, even with a valid invite.
      </p>

      {bans.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-bg py-12 text-xs text-text-muted">
          <Ban className="h-6 w-6" />
          No one is banned from this server.
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {bans.map((b) => (
            <li
              key={b.user.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg p-3"
            >
              <Avatar
                name={b.user.displayName || b.user.username}
                color={b.user.avatarColor}
                imageUrl={b.user.avatarUrl}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {b.user.displayName || b.user.username}
                </div>
                <div className="truncate text-[11px] text-text-muted">
                  #{b.user.discriminator}
                  {b.reason ? ` — ${b.reason}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onUnban(b)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-text-muted hover:bg-surface-hover hover:text-text"
              >
                <UserX className="h-3.5 w-3.5" />
                Unban
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
