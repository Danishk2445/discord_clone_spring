import { API_BASE } from "./api-base";
import type {
  Attachment,
  Category,
  Channel,
  DirectMessage,
  Friend,
  FriendRelation,
  InboxData,
  Invite,
  InvitePreview,
  Member,
  Message,
  NotificationLevel,
  NotificationLevelMap,
  PublicUser,
  Role,
  SelfUser,
  Server,
  ServerBan,
  UnreadMap,
} from "./types";

export type SendMessageInput = {
  content: string;
  replyToId?: string | null;
  attachments?: Attachment[];
  mentions?: string[];
};

type Init = RequestInit & { skipAuthRedirect?: boolean };

async function clientFetch(path: string, init: Init = {}) {
  const { skipAuthRedirect, ...rest } = init;
  const r = await fetch(`${API_BASE}${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(rest.headers ?? {}),
    },
  });
  if (
    r.status === 401 &&
    !skipAuthRedirect &&
    typeof window !== "undefined" &&
    !window.location.pathname.startsWith("/login") &&
    !window.location.pathname.startsWith("/register")
  ) {
    window.location.href = "/login";
  }
  return r;
}

export type LoginResult =
  | { ok: true; user: SelfUser }
  | { ok: false; error: string };

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const r = await clientFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuthRedirect: true,
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "login_failed" };
  }
  const data = (await r.json()) as { user: SelfUser };
  return { ok: true, user: data.user };
}

export async function register(
  email: string,
  password: string,
  username: string,
): Promise<LoginResult> {
  const r = await clientFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password, username }),
    skipAuthRedirect: true,
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "register_failed" };
  }
  const data = (await r.json()) as { user: SelfUser };
  return { ok: true, user: data.user };
}

export async function logout() {
  await clientFetch("/api/auth/logout", {
    method: "POST",
    skipAuthRedirect: true,
  });
}

export async function listChannelMessages(
  channelId: string,
): Promise<{ messages: Message[]; lastReadAt: number }> {
  const r = await clientFetch(`/api/channels/${channelId}/messages`);
  if (!r.ok) return { messages: [], lastReadAt: 0 };
  return (await r.json()) as { messages: Message[]; lastReadAt: number };
}

export async function listDmMessages(
  dmId: string,
): Promise<{ messages: Message[]; lastReadAt: number }> {
  const r = await clientFetch(`/api/dms/${dmId}/messages`);
  if (!r.ok) return { messages: [], lastReadAt: 0 };
  return (await r.json()) as { messages: Message[]; lastReadAt: number };
}

export async function sendChannelMessage(
  channelId: string,
  input: SendMessageInput,
): Promise<Message | null> {
  const r = await clientFetch(`/api/channels/${channelId}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { message: Message };
  return data.message;
}

export async function sendDmMessage(
  dmId: string,
  input: SendMessageInput,
): Promise<Message | null> {
  const r = await clientFetch(`/api/dms/${dmId}/messages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { message: Message };
  return data.message;
}

export async function editDmMessage(
  dmId: string,
  messageId: string,
  content: string,
  mentions: string[] = [],
): Promise<Message | null> {
  const r = await clientFetch(
    `/api/dms/${dmId}/messages/${messageId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ content, mentions }),
    },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as { message: Message };
  return data.message;
}

export async function deleteDmMessage(
  dmId: string,
  messageId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/dms/${dmId}/messages/${messageId}`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function addDmReaction(
  dmId: string,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/dms/${dmId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: "PUT" },
  );
  return r.ok;
}

export async function removeDmReaction(
  dmId: string,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/dms/${dmId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function searchDmMessages(
  dmId: string,
  query: string,
  options: { fromUserId?: string } = {},
): Promise<Message[]> {
  const params = new URLSearchParams({ q: query });
  if (options.fromUserId) params.set("from", options.fromUserId);
  const r = await clientFetch(
    `/api/dms/${dmId}/messages/search?${params.toString()}`,
  );
  if (!r.ok) return [];
  const data = (await r.json()) as { messages: Message[] };
  return data.messages;
}

export async function openDmWithUser(
  userId: string,
): Promise<DirectMessage | null> {
  const r = await clientFetch("/api/dms", {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { dm: DirectMessage };
  return data.dm;
}

export async function listFriends(
  filter: FriendRelation | "online" = "all",
): Promise<Friend[]> {
  const r = await clientFetch(`/api/friends?filter=${filter}`);
  if (!r.ok) return [];
  const data = (await r.json()) as { friends: Friend[] };
  return data.friends;
}

export async function getUser(userId: string): Promise<PublicUser | null> {
  const r = await clientFetch(`/api/users/${userId}`);
  if (!r.ok) return null;
  const data = (await r.json()) as { user: PublicUser };
  return data.user;
}

export async function updateProfile(input: {
  displayName?: string;
  bio?: string;
  avatarUrl?: string | null;
  status?: "online" | "idle" | "dnd" | "offline";
}): Promise<SelfUser | null> {
  const r = await clientFetch("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { user: SelfUser };
  return data.user;
}

export async function sendFriendRequest(
  username: string,
): Promise<{ ok: true; accepted: boolean } | { ok: false; error: string }> {
  const r = await clientFetch("/api/friends/request", {
    method: "POST",
    body: JSON.stringify({ username }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return { ok: false, error: data.error ?? "request_failed" };
  }
  const data = (await r.json()) as { accepted?: boolean };
  return { ok: true, accepted: !!data.accepted };
}

export async function acceptFriend(userId: string): Promise<boolean> {
  const r = await clientFetch(`/api/friends/${userId}/accept`, {
    method: "POST",
  });
  return r.ok;
}

export async function removeFriend(userId: string): Promise<boolean> {
  const r = await clientFetch(`/api/friends/${userId}`, { method: "DELETE" });
  return r.ok;
}

export async function createServer(input: {
  name: string;
  accent?: string;
}): Promise<Server | null> {
  const r = await clientFetch("/api/servers", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { server: Server };
  return data.server;
}

export async function leaveServer(serverId: string): Promise<boolean> {
  const r = await clientFetch(`/api/servers/${serverId}/members/me`, {
    method: "DELETE",
  });
  return r.ok;
}

export async function updateServer(
  serverId: string,
  input: {
    name?: string;
    accent?: string;
    iconUrl?: string | null;
    bannerUrl?: string | null;
  },
): Promise<Server | null> {
  const r = await clientFetch(`/api/servers/${serverId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { server: Server };
  return data.server;
}

export async function deleteServer(serverId: string): Promise<boolean> {
  const r = await clientFetch(`/api/servers/${serverId}`, {
    method: "DELETE",
  });
  return r.ok;
}

export async function kickMember(
  serverId: string,
  userId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/servers/${serverId}/members/${userId}`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function banMember(
  serverId: string,
  userId: string,
  reason?: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/servers/${serverId}/bans/${userId}`,
    {
      method: "POST",
      body: JSON.stringify({ reason: reason ?? null }),
    },
  );
  return r.ok;
}

export async function unbanMember(
  serverId: string,
  userId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/servers/${serverId}/bans/${userId}`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function listBans(serverId: string): Promise<ServerBan[]> {
  const r = await clientFetch(`/api/servers/${serverId}/bans`);
  if (!r.ok) return [];
  const data = (await r.json()) as { bans: ServerBan[] };
  return data.bans;
}

export async function listMembers(serverId: string): Promise<Member[]> {
  const r = await clientFetch(`/api/servers/${serverId}/members`);
  if (!r.ok) return [];
  const data = (await r.json()) as { members: Member[] };
  return data.members;
}

export async function createCategory(
  serverId: string,
  input: { name: string },
): Promise<Category | null> {
  const r = await clientFetch(`/api/servers/${serverId}/categories`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { category: Category };
  return data.category;
}

export async function updateCategory(
  serverId: string,
  categoryId: string,
  input: { name: string },
): Promise<Category | null> {
  const r = await clientFetch(
    `/api/servers/${serverId}/categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as { category: Category };
  return data.category;
}

export async function deleteCategory(
  serverId: string,
  categoryId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/servers/${serverId}/categories/${categoryId}`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function createChannel(
  serverId: string,
  input: { name: string; categoryId?: string; kind?: "text" | "voice" },
): Promise<Channel | null> {
  const r = await clientFetch(`/api/servers/${serverId}/channels`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { channel: Channel };
  return data.channel;
}

export async function updateChannel(
  channelId: string,
  input: { name?: string; topic?: string },
): Promise<Channel | null> {
  const r = await clientFetch(`/api/channels/${channelId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { channel: Channel };
  return data.channel;
}

export async function deleteChannel(channelId: string): Promise<boolean> {
  const r = await clientFetch(`/api/channels/${channelId}`, {
    method: "DELETE",
  });
  return r.ok;
}

export async function createInvite(
  serverId: string,
): Promise<Invite | null> {
  const r = await clientFetch(`/api/servers/${serverId}/invites`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { invite: Invite };
  return data.invite;
}

export async function getInvite(code: string): Promise<InvitePreview | null> {
  const r = await clientFetch(`/api/invites/${code}`, { skipAuthRedirect: true });
  if (!r.ok) return null;
  return (await r.json()) as InvitePreview;
}

export async function acceptInvite(
  code: string,
): Promise<{ server: Server; alreadyMember: boolean } | null> {
  const r = await clientFetch(`/api/invites/${code}/accept`, {
    method: "POST",
  });
  if (!r.ok) return null;
  return (await r.json()) as { server: Server; alreadyMember: boolean };
}

export async function listRoles(serverId: string): Promise<Role[]> {
  const r = await clientFetch(`/api/servers/${serverId}/roles`);
  if (!r.ok) return [];
  const data = (await r.json()) as { roles: Role[] };
  return data.roles;
}

export async function createRole(
  serverId: string,
  input: { name: string; color?: string; permissions?: number },
): Promise<Role | null> {
  const r = await clientFetch(`/api/servers/${serverId}/roles`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { role: Role };
  return data.role;
}

export async function updateRole(
  serverId: string,
  roleId: string,
  input: { name?: string; color?: string; permissions?: number },
): Promise<Role | null> {
  const r = await clientFetch(`/api/servers/${serverId}/roles/${roleId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { role: Role };
  return data.role;
}

export async function deleteRole(
  serverId: string,
  roleId: string,
): Promise<boolean> {
  const r = await clientFetch(`/api/servers/${serverId}/roles/${roleId}`, {
    method: "DELETE",
  });
  return r.ok;
}

export async function assignRole(
  serverId: string,
  userId: string,
  roleId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/servers/${serverId}/members/${userId}/roles`,
    {
      method: "POST",
      body: JSON.stringify({ roleId }),
    },
  );
  return r.ok;
}

export async function unassignRole(
  serverId: string,
  userId: string,
  roleId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/servers/${serverId}/members/${userId}/roles/${roleId}`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function getServerMembership(
  serverId: string,
): Promise<{ isOwner: boolean; roleIds: string[] } | null> {
  const r = await clientFetch(`/api/servers/${serverId}/me`);
  if (!r.ok) return null;
  return (await r.json()) as { isOwner: boolean; roleIds: string[] };
}

export async function uploadFile(file: File): Promise<Attachment | null> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${API_BASE}/api/uploads`, {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { attachment: Attachment };
  return data.attachment;
}

export async function editChannelMessage(
  channelId: string,
  messageId: string,
  content: string,
  mentions: string[] = [],
): Promise<Message | null> {
  const r = await clientFetch(`/api/channels/${channelId}/messages/${messageId}`, {
    method: "PATCH",
    body: JSON.stringify({ content, mentions }),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { message: Message };
  return data.message;
}

export async function deleteChannelMessage(
  channelId: string,
  messageId: string,
): Promise<boolean> {
  const r = await clientFetch(`/api/channels/${channelId}/messages/${messageId}`, {
    method: "DELETE",
  });
  return r.ok;
}

export async function addChannelReaction(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: "PUT" },
  );
  return r.ok;
}

export async function removeChannelReaction(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/channels/${channelId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function searchChannelMessages(
  channelId: string,
  query: string,
  options: { fromUserId?: string } = {},
): Promise<Message[]> {
  const params = new URLSearchParams({ q: query });
  if (options.fromUserId) params.set("from", options.fromUserId);
  const r = await clientFetch(
    `/api/channels/${channelId}/messages/search?${params.toString()}`,
  );
  if (!r.ok) return [];
  const data = (await r.json()) as { messages: Message[] };
  return data.messages;
}

export async function createGroupDm(
  userIds: string[],
  groupName?: string,
): Promise<DirectMessage | null> {
  const r = await clientFetch("/api/dms", {
    method: "POST",
    body: JSON.stringify({ userIds, groupName }),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { dm: DirectMessage };
  return data.dm;
}

export async function renameGroupDm(
  dmId: string,
  groupName: string,
): Promise<DirectMessage | null> {
  const r = await clientFetch(`/api/dms/${dmId}`, {
    method: "PATCH",
    body: JSON.stringify({ groupName }),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { dm: DirectMessage };
  return data.dm;
}

export async function addDmParticipant(
  dmId: string,
  userId: string,
): Promise<DirectMessage | null> {
  const r = await clientFetch(`/api/dms/${dmId}/participants`, {
    method: "POST",
    body: JSON.stringify({ userId }),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { dm: DirectMessage };
  return data.dm;
}

export async function leaveGroupDm(dmId: string): Promise<boolean> {
  const r = await clientFetch(`/api/dms/${dmId}/participants/me`, {
    method: "DELETE",
  });
  return r.ok;
}

export async function markChannelRead(channelId: string): Promise<boolean> {
  const r = await clientFetch(`/api/channels/${channelId}/read`, {
    method: "POST",
  });
  return r.ok;
}

export async function markDmRead(dmId: string): Promise<boolean> {
  const r = await clientFetch(`/api/dms/${dmId}/read`, { method: "POST" });
  return r.ok;
}

export async function getUnread(): Promise<UnreadMap> {
  const r = await clientFetch("/api/users/me/unread");
  if (!r.ok) return {};
  const data = (await r.json()) as { unread: UnreadMap };
  return data.unread;
}

export async function blockUser(userId: string): Promise<boolean> {
  const r = await clientFetch(`/api/friends/${userId}/block`, {
    method: "POST",
  });
  return r.ok;
}

export async function unblockUser(userId: string): Promise<boolean> {
  const r = await clientFetch(`/api/friends/${userId}/block`, {
    method: "DELETE",
  });
  return r.ok;
}

export async function getMyBlocks(): Promise<string[]> {
  const r = await clientFetch("/api/users/me");
  if (!r.ok) return [];
  const data = (await r.json()) as { blockedUserIds?: string[] };
  return data.blockedUserIds ?? [];
}

export async function listChannelPins(channelId: string): Promise<Message[]> {
  const r = await clientFetch(`/api/channels/${channelId}/pins`);
  if (!r.ok) return [];
  const data = (await r.json()) as { messages: Message[] };
  return data.messages;
}

export async function listDmPins(dmId: string): Promise<Message[]> {
  const r = await clientFetch(`/api/dms/${dmId}/pins`);
  if (!r.ok) return [];
  const data = (await r.json()) as { messages: Message[] };
  return data.messages;
}

export async function pinChannelMessage(
  channelId: string,
  messageId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/channels/${channelId}/messages/${messageId}/pin`,
    { method: "PUT" },
  );
  return r.ok;
}

export async function unpinChannelMessage(
  channelId: string,
  messageId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/channels/${channelId}/messages/${messageId}/pin`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function pinDmMessage(
  dmId: string,
  messageId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/dms/${dmId}/messages/${messageId}/pin`,
    { method: "PUT" },
  );
  return r.ok;
}

export async function unpinDmMessage(
  dmId: string,
  messageId: string,
): Promise<boolean> {
  const r = await clientFetch(
    `/api/dms/${dmId}/messages/${messageId}/pin`,
    { method: "DELETE" },
  );
  return r.ok;
}

export async function getNotificationLevels(): Promise<NotificationLevelMap> {
  const r = await clientFetch("/api/users/me/notifications");
  if (!r.ok) return {};
  const data = (await r.json()) as { levels: NotificationLevelMap };
  return data.levels;
}

export async function setChannelNotificationLevel(
  channelId: string,
  level: NotificationLevel,
): Promise<boolean> {
  const r = await clientFetch(`/api/channels/${channelId}/notifications`, {
    method: "PUT",
    body: JSON.stringify({ level }),
  });
  return r.ok;
}

export async function setDmNotificationLevel(
  dmId: string,
  level: NotificationLevel,
): Promise<boolean> {
  const r = await clientFetch(`/api/dms/${dmId}/notifications`, {
    method: "PUT",
    body: JSON.stringify({ level }),
  });
  return r.ok;
}

export async function getMyMentions(): Promise<Message[]> {
  const r = await clientFetch("/api/users/me/mentions");
  if (!r.ok) return [];
  const data = (await r.json()) as { messages: Message[] };
  return data.messages;
}

export async function getInbox(): Promise<InboxData> {
  const r = await clientFetch("/api/users/me/inbox");
  if (!r.ok) return { mentions: [], unreads: [] };
  return (await r.json()) as InboxData;
}
