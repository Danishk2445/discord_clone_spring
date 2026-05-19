export type Presence = "online" | "idle" | "dnd" | "offline";

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  discriminator: string;
  avatarColor: string;
  avatarUrl: string | null;
  bio: string | null;
  status: Presence;
};

export type SelfUser = PublicUser & {
  email: string;
};

export type Server = {
  id: string;
  name: string;
  short: string;
  accent: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  ownerId?: string;
};

export type ServerBan = {
  user: PublicUser;
  bannedBy: string;
  reason: string | null;
  createdAt: number;
};

export type Category = {
  id: string;
  serverId: string;
  name: string;
};

export type ChannelKind = "text" | "voice";

export type Channel = {
  id: string;
  serverId: string;
  categoryId: string;
  name: string;
  kind: ChannelKind;
  topic: string | null;
};

export type Attachment = {
  url: string;
  name: string;
  contentType: string | null;
  size: number | null;
};

export type ReactionSummary = {
  emoji: string;
  count: number;
  userIds: string[];
};

export type MessageKind = "default" | "pin";

export type Message = {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  createdAt: number;
  editedAt: number | null;
  deletedAt: number | null;
  replyToId: string | null;
  attachments: Attachment[];
  mentions: string[];
  reactions: ReactionSummary[];
  pinnedAt: number | null;
  kind: MessageKind;
};

export type NotificationLevel = "all" | "mentions" | "nothing";
export type NotificationLevelMap = Record<string, NotificationLevel>;

export type InboxLocation =
  | {
      kind: "channel";
      id: string;
      name: string;
      serverId: string;
      serverName: string;
    }
  | { kind: "dm"; id: string; name: string };

export type InboxMention = {
  message: Message;
  location: InboxLocation;
};

export type InboxUnread = {
  location: InboxLocation;
  unreadCount: number;
  mentionCount: number;
  lastReadAt: number;
};

export type InboxData = {
  mentions: InboxMention[];
  unreads: InboxUnread[];
};

export type DirectMessage = {
  id: string;
  isGroup: boolean;
  groupName: string | null;
  participantIds: string[];
};

export type FriendRelation = "all" | "pending" | "blocked";

export type Friend = {
  user: PublicUser;
  relation: FriendRelation;
  pendingDirection?: "incoming" | "outgoing";
};

export type ChannelKindForChat = "channel" | "dm";

export type UnreadEntry = {
  unreadCount: number;
  mentionCount: number;
  lastReadAt: number;
  serverId: string | null;
};
export type UnreadMap = Record<string, UnreadEntry>;

export type VoiceMember = {
  userId: string;
  muted: boolean;
  deafened: boolean;
  speaking: boolean;
};

export type VoiceStateMap = Record<string, VoiceMember[]>;

export type PendingDmCall = {
  dmId: string;
  callerId: string;
  startedAt: number;
};

export type WsEvent =
  | {
      type: "hello";
      userId: string;
      voiceStates: VoiceStateMap;
      pendingDmCalls: PendingDmCall[];
    }
  | {
      type: "call:incoming";
      dmId: string;
      callerId: string;
      startedAt: number;
    }
  | {
      type: "call:ended";
      dmId: string;
    }
  | { type: "message"; message: Message }
  | { type: "message:update"; message: Message }
  | {
      type: "message:delete";
      channelId: string;
      messageId: string;
      deletedAt: number;
    }
  | {
      type: "reaction";
      channelId: string;
      messageId: string;
      emoji: string;
      userId: string;
      action: "add" | "remove";
    }
  | {
      type: "typing";
      channelId: string;
      userId: string;
      at: number;
    }
  | {
      type: "message:pin";
      channelId: string;
      messageId: string;
      pinnedAt: number | null;
    }
  | {
      type: "presence";
      userId: string;
      status: Presence;
    }
  | {
      type: "voice:joined";
      channelId: string;
      selfUserId: string;
      members: VoiceMember[];
    }
  | {
      type: "voice:peer_join";
      channelId: string;
      member: VoiceMember;
    }
  | {
      type: "voice:peer_leave";
      channelId: string;
      userId: string;
    }
  | {
      type: "voice:peer_update";
      channelId: string;
      member: VoiceMember;
    }
  | {
      type: "voice:signal";
      channelId: string;
      fromUserId: string;
      payload: unknown;
    }
  | {
      type: "voice:error";
      channelId: string;
      error: string;
    }
  | {
      type: "voice:kicked";
      channelId: string;
      reason: string;
    };

export const PERM = {
  MANAGE_SERVER:    1 << 0,
  MANAGE_CHANNELS:  1 << 1,
  MANAGE_ROLES:     1 << 2,
  MANAGE_MESSAGES:  1 << 3,
  KICK_MEMBERS:     1 << 4,
  CREATE_INVITES:   1 << 5,
  MENTION_EVERYONE: 1 << 6,
  BAN_MEMBERS:      1 << 7,
} as const;

export type PermissionKey = keyof typeof PERM;

export const PERMISSION_META: { key: PermissionKey; label: string; description: string }[] = [
  { key: "MANAGE_SERVER",    label: "Manage Server",    description: "Rename, change icon, delete" },
  { key: "MANAGE_CHANNELS",  label: "Manage Channels",  description: "Create, rename, and delete channels" },
  { key: "MANAGE_ROLES",     label: "Manage Roles",     description: "Create, edit, and assign roles" },
  { key: "MANAGE_MESSAGES",  label: "Manage Messages",  description: "Delete other members' messages" },
  { key: "KICK_MEMBERS",     label: "Kick Members",     description: "Remove members from this server" },
  { key: "BAN_MEMBERS",      label: "Ban Members",      description: "Permanently bar members from this server" },
  { key: "CREATE_INVITES",   label: "Create Invites",   description: "Generate invite links" },
  { key: "MENTION_EVERYONE", label: "Mention @everyone", description: "Notify everyone or @here in a channel" },
];

export type Role = {
  id: string;
  serverId: string;
  name: string;
  color: string;
  permissions: number;
  position: number;
  isEveryone: boolean;
};

export type Member = {
  user: PublicUser;
  roleIds: string[];
  isOwner: boolean;
};

export type Invite = {
  code: string;
  serverId: string;
  inviterId: string;
  createdAt: number;
  expiresAt: number | null;
  uses: number;
  maxUses: number | null;
};

export type InvitePreview = {
  server: Server;
  alreadyMember: boolean;
  code: string;
  memberCount: number;
  onlineCount: number;
  serverCreatedAt: number;
};
