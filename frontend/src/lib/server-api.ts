import "server-only";
import { cookies } from "next/headers";
import { API_BASE } from "./api-base";
import type {
  Category,
  Channel,
  DirectMessage,
  Friend,
  FriendRelation,
  InvitePreview,
  NotificationLevelMap,
  PublicUser,
  SelfUser,
  Server,
  UnreadMap,
} from "./types";

async function serverFetch(path: string, init: RequestInit = {}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    cache: "no-store",
  });
}

export async function getMe(): Promise<SelfUser | null> {
  const r = await serverFetch("/api/auth/me");
  if (!r.ok) return null;
  const data = (await r.json()) as { user: SelfUser };
  return data.user;
}

export async function listServers(): Promise<Server[]> {
  const r = await serverFetch("/api/servers");
  if (!r.ok) return [];
  const data = (await r.json()) as { servers: Server[] };
  return data.servers;
}

export async function getServerWithChannels(
  serverId: string,
): Promise<{
  server: Server;
  categories: Category[];
  channels: Channel[];
  isOwner: boolean;
} | null> {
  const r = await serverFetch(`/api/servers/${serverId}`);
  if (!r.ok) return null;
  return (await r.json()) as {
    server: Server;
    categories: Category[];
    channels: Channel[];
    isOwner: boolean;
  };
}

export async function getInvitePreview(
  code: string,
): Promise<InvitePreview | null> {
  const r = await serverFetch(`/api/invites/${code}`);
  if (!r.ok) return null;
  return (await r.json()) as InvitePreview;
}

export async function listMembers(serverId: string) {
  const r = await serverFetch(`/api/servers/${serverId}/members`);
  if (!r.ok) return [];
  const data = (await r.json()) as { members: import("./types").Member[] };
  return data.members;
}

export async function listRoles(serverId: string) {
  const r = await serverFetch(`/api/servers/${serverId}/roles`);
  if (!r.ok) return [];
  const data = (await r.json()) as { roles: import("./types").Role[] };
  return data.roles;
}

export async function getChannel(channelId: string): Promise<Channel | null> {
  const r = await serverFetch(`/api/channels/${channelId}`);
  if (!r.ok) return null;
  const data = (await r.json()) as { channel: Channel };
  return data.channel;
}

export async function listDMs(): Promise<DirectMessage[]> {
  const r = await serverFetch("/api/dms");
  if (!r.ok) return [];
  const data = (await r.json()) as { dms: DirectMessage[] };
  return data.dms;
}

export async function getDM(dmId: string): Promise<DirectMessage | null> {
  const r = await serverFetch(`/api/dms/${dmId}`);
  if (!r.ok) return null;
  const data = (await r.json()) as { dm: DirectMessage };
  return data.dm;
}

export async function listFriends(
  filter: FriendRelation | "online" = "all",
): Promise<Friend[]> {
  const r = await serverFetch(`/api/friends?filter=${filter}`);
  if (!r.ok) return [];
  const data = (await r.json()) as { friends: Friend[] };
  return data.friends;
}

export async function getUser(userId: string): Promise<PublicUser | null> {
  const r = await serverFetch(`/api/users/${userId}`);
  if (!r.ok) return null;
  const data = (await r.json()) as { user: PublicUser };
  return data.user;
}

export async function getMyBlocks(): Promise<string[]> {
  const r = await serverFetch("/api/users/me");
  if (!r.ok) return [];
  const data = (await r.json()) as { blockedUserIds?: string[] };
  return data.blockedUserIds ?? [];
}

export async function getUnread(): Promise<UnreadMap> {
  const r = await serverFetch("/api/users/me/unread");
  if (!r.ok) return {};
  const data = (await r.json()) as { unread: UnreadMap };
  return data.unread;
}

export async function getServerMembership(
  serverId: string,
): Promise<{ isOwner: boolean; roleIds: string[] } | null> {
  const r = await serverFetch(`/api/servers/${serverId}/me`);
  if (!r.ok) return null;
  return (await r.json()) as { isOwner: boolean; roleIds: string[] };
}

export async function getNotificationLevels(): Promise<NotificationLevelMap> {
  const r = await serverFetch("/api/users/me/notifications");
  if (!r.ok) return {};
  const data = (await r.json()) as { levels: NotificationLevelMap };
  return data.levels;
}
