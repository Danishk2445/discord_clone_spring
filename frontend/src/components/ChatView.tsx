"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  BellOff,
  Check,
  Hash,
  Inbox,
  Phone,
  Pin,
  Search,
  UsersRound,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  addChannelReaction,
  addDmReaction,
  deleteChannelMessage,
  deleteDmMessage,
  editChannelMessage,
  editDmMessage,
  getInbox,
  getUser,
  listChannelMessages,
  listChannelPins,
  listDmMessages,
  listDmPins,
  markChannelRead,
  markDmRead,
  pinChannelMessage,
  pinDmMessage,
  removeChannelReaction,
  removeDmReaction,
  searchChannelMessages,
  searchDmMessages,
  setChannelNotificationLevel,
  setDmNotificationLevel,
  unpinChannelMessage,
  unpinDmMessage,
} from "@/lib/client-api";
import { subscribeRealtime, subscribeVoiceState } from "@/lib/realtime";
import { previewWithMentions } from "@/lib/mentions";
import type {
  ChannelKindForChat,
  InboxData,
  Message,
  NotificationLevel,
  PublicUser,
  SelfUser,
  VoiceMember,
} from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { DmCallPanel } from "./DmCallPanel";

const GROUP_WINDOW_MS = 5 * 60 * 1000;

type UserMap = Record<string, PublicUser | SelfUser>;

export function ChatView({
  channelId,
  kind,
  title,
  subtitle,
  icon = "hash",
  composerPlaceholder,
  users,
  backfillMissingUsers = false,
  showHeaderActions = true,
  selfId,
  mentionables,
  blockedUserIds,
  membersOpen,
  onToggleMembers,
  canPin = false,
  canDeleteOthers = false,
  canMentionEveryone = false,
  initialNotificationLevel = "all",
}: {
  channelId: string;
  kind: ChannelKindForChat;
  title: string;
  subtitle?: string;
  icon?: "hash" | "voice" | "dm";
  composerPlaceholder: string;
  users: UserMap;
  backfillMissingUsers?: boolean;
  showHeaderActions?: boolean;
  selfId: string;
  mentionables?: (PublicUser | SelfUser)[];
  blockedUserIds?: string[];
  membersOpen?: boolean;
  onToggleMembers?: () => void;
  canPin?: boolean;
  canDeleteOthers?: boolean;
  canMentionEveryone?: boolean;
  initialNotificationLevel?: NotificationLevel;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userMap, setUserMap] = useState<UserMap>(users);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<Message[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, number>>({});
  const [cutoffAt, setCutoffAt] = useState<number>(0);
  const [pinsOpen, setPinsOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxTab, setInboxTab] = useState<"unreads" | "mentions">("unreads");
  const [inbox, setInbox] = useState<InboxData>({ mentions: [], unreads: [] });
  const [inboxLoading, setInboxLoading] = useState(false);
  const [inboxVersion, setInboxVersion] = useState(0);
  const [pins, setPins] = useState<Message[]>([]);
  const [pinsLoading, setPinsLoading] = useState(false);
  const [notifLevel, setNotifLevel] =
    useState<NotificationLevel>(initialNotificationLevel);
  const [callOpen, setCallOpen] = useState(false);
  const [callMembers, setCallMembers] = useState<VoiceMember[]>([]);
  const pinsRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);
  const inboxRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userMapRef = useRef(userMap);
  userMapRef.current = userMap;
  // Cutoff is captured once per channel-visit and frozen for the session,
  // so the "New" line stays put even after we POST mark-read.
  const cutoffByChannel = useRef<Map<string, number>>(new Map());
  const blocked = useMemo(
    () => new Set(blockedUserIds ?? []),
    [blockedUserIds],
  );

  const ensureUser = useCallback(async (userId: string) => {
    if (userMapRef.current[userId]) return;
    const u = await getUser(userId);
    if (u) setUserMap((m) => ({ ...m, [userId]: u }));
  }, []);

  const load = useCallback(async () => {
    const fetcher = kind === "dm" ? listDmMessages : listChannelMessages;
    const { messages: m, lastReadAt } = await fetcher(channelId);
    setMessages(m);
    if (!cutoffByChannel.current.has(channelId)) {
      cutoffByChannel.current.set(channelId, lastReadAt);
    }
    setCutoffAt(cutoffByChannel.current.get(channelId) ?? 0);
    // Only mark read AFTER we've captured the cutoff, so the GET races
    // can't overwrite our "New" divider.
    const mark = kind === "dm" ? markDmRead : markChannelRead;
    void mark(channelId);
    if (backfillMissingUsers) {
      const missing = new Set<string>();
      for (const msg of m) if (!userMapRef.current[msg.authorId]) missing.add(msg.authorId);
      await Promise.all([...missing].map(ensureUser));
    }
  }, [channelId, kind, backfillMissingUsers, ensureUser]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const unsubscribe = subscribeRealtime((event) => {
      if (event.type === "message") {
        if (
          event.message.authorId !== selfId &&
          (event.message.mentions.includes(selfId) ||
            event.message.mentions.includes("@everyone") ||
            event.message.mentions.includes("@here"))
        ) {
          setInboxVersion((v) => v + 1);
        }
        if (event.message.channelId !== channelId) return;
        setMessages((prev) =>
          prev.some((m) => m.id === event.message.id)
            ? prev
            : [...prev, event.message],
        );
        if (backfillMissingUsers) void ensureUser(event.message.authorId);
        return;
      }
      if (event.type === "message:update") {
        if (event.message.channelId !== channelId) return;
        setMessages((prev) =>
          prev.map((m) => (m.id === event.message.id ? event.message : m)),
        );
        return;
      }
      if (event.type === "message:delete") {
        if (event.channelId !== channelId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId
              ? {
                  ...m,
                  deletedAt: event.deletedAt,
                  content: "",
                  attachments: [],
                  mentions: [],
                  reactions: [],
                }
              : m,
          ),
        );
        return;
      }
      if (event.type === "reaction") {
        if (event.channelId !== channelId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId
              ? applyReaction(m, event.emoji, event.userId, event.action)
              : m,
          ),
        );
        return;
      }
      if (event.type === "typing") {
        if (event.channelId !== channelId) return;
        if (event.userId === selfId) return;
        setTypingUsers((prev) => ({ ...prev, [event.userId]: event.at }));
        if (backfillMissingUsers) void ensureUser(event.userId);
        return;
      }
      if (event.type === "message:pin") {
        if (event.channelId !== channelId) return;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === event.messageId ? { ...m, pinnedAt: event.pinnedAt } : m,
          ),
        );
        setPins((prev) => {
          if (event.pinnedAt === null) {
            return prev.filter((m) => m.id !== event.messageId);
          }
          const existing = prev.find((m) => m.id === event.messageId);
          if (existing) {
            return prev.map((m) =>
              m.id === event.messageId
                ? { ...m, pinnedAt: event.pinnedAt }
                : m,
            );
          }
          return prev;
        });
      }
    });
    return unsubscribe;
  }, [channelId, backfillMissingUsers, ensureUser, selfId]);

  useEffect(() => {
    setPinsOpen(false);
    setNotifsOpen(false);
    setPins([]);
    setNotifLevel(initialNotificationLevel);
    setCallOpen(false);
    setCallMembers([]);
  }, [channelId, initialNotificationLevel]);

  useEffect(() => {
    if (kind !== "dm") return;
    return subscribeVoiceState((states) => {
      setCallMembers(states[channelId] ?? []);
    });
  }, [channelId, kind]);

  useEffect(() => {
    if (!pinsOpen) return;
    setPinsLoading(true);
    const fn = kind === "dm" ? listDmPins : listChannelPins;
    let cancelled = false;
    void fn(channelId).then((rows) => {
      if (cancelled) return;
      setPins(rows);
      setPinsLoading(false);
      if (backfillMissingUsers) {
        const missing = new Set<string>();
        for (const m of rows) {
          if (!userMapRef.current[m.authorId]) missing.add(m.authorId);
        }
        void Promise.all([...missing].map(ensureUser));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pinsOpen, channelId, kind, backfillMissingUsers, ensureUser]);

  useEffect(() => {
    if (!pinsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pinsRef.current?.contains(e.target as Node)) setPinsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pinsOpen]);

  useEffect(() => {
    if (!notifsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!notifsRef.current?.contains(e.target as Node)) setNotifsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notifsOpen]);

  useEffect(() => {
    if (!inboxOpen) return;
    setInboxLoading(true);
    let cancelled = false;
    void getInbox().then((data) => {
      if (cancelled) return;
      setInbox(data);
      setInboxLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [inboxOpen, inboxVersion]);

  useEffect(() => {
    if (!inboxOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!inboxRef.current?.contains(e.target as Node)) setInboxOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [inboxOpen]);

  const onTogglePin = useCallback(
    async (message: Message, pin: boolean) => {
      if (kind === "dm") {
        const fn = pin ? pinDmMessage : unpinDmMessage;
        await fn(channelId, message.id);
      } else {
        const fn = pin ? pinChannelMessage : unpinChannelMessage;
        await fn(channelId, message.id);
      }
    },
    [channelId, kind],
  );

  const onSelectNotifLevel = useCallback(
    async (level: NotificationLevel) => {
      const prev = notifLevel;
      setNotifLevel(level);
      setNotifsOpen(false);
      const fn = kind === "dm" ? setDmNotificationLevel : setChannelNotificationLevel;
      const ok = await fn(channelId, level);
      if (!ok) setNotifLevel(prev);
    },
    [channelId, kind, notifLevel],
  );

  // Expire typing entries that haven't been refreshed in 6s.
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        let changed = false;
        const next: Record<string, number> = {};
        for (const [uid, at] of Object.entries(prev)) {
          if (now - at < 6000) next[uid] = at;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Reset typing when switching channels.
  useEffect(() => {
    setTypingUsers({});
  }, [channelId]);

  // After load(), mark-read fires once. Also re-mark when new messages
  // arrive in the open channel via WS so the badge clears in real time.
  useEffect(() => {
    if (messages.length === 0) return;
    const mark = kind === "dm" ? markDmRead : markChannelRead;
    void mark(channelId);
  }, [channelId, kind, messages.length]);

  useEffect(() => {
    if (searchResults !== null) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, searchResults]);

  const onReply = useCallback((m: Message) => setReplyTo(m), []);

  const onEdit = useCallback(
    async (messageId: string, content: string, mentions: string[]) => {
      const fn = kind === "dm" ? editDmMessage : editChannelMessage;
      const updated = await fn(channelId, messageId, content, mentions);
      if (updated) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? updated : m)),
        );
        return true;
      }
      return false;
    },
    [channelId, kind],
  );

  const onDelete = useCallback(
    async (m: Message) => {
      const fn = kind === "dm" ? deleteDmMessage : deleteChannelMessage;
      const ok = await fn(channelId, m.id);
      if (ok) {
        const deletedAt = Date.now();
        setMessages((prev) =>
          prev.map((x) =>
            x.id === m.id
              ? {
                  ...x,
                  deletedAt,
                  content: "",
                  attachments: [],
                  mentions: [],
                  reactions: [],
                }
              : x,
          ),
        );
      }
    },
    [channelId, kind],
  );

  const onReact = useCallback(
    async (m: Message, emoji: string, mine: boolean) => {
      const add = kind === "dm" ? addDmReaction : addChannelReaction;
      const remove = kind === "dm" ? removeDmReaction : removeChannelReaction;
      const action = mine ? remove : add;
      const ok = await action(channelId, m.id, emoji);
      if (ok) {
        setMessages((prev) =>
          prev.map((x) =>
            x.id === m.id
              ? applyReaction(x, emoji, selfId, mine ? "remove" : "add")
              : x,
          ),
        );
      }
    },
    [channelId, kind, selfId],
  );

  const onJumpTo = useCallback((messageId: string) => {
    setSearchResults(null);
    requestAnimationFrame(() => {
      const el = document.getElementById(`msg-${messageId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-accent/60");
        setTimeout(() => el.classList.remove("ring-2", "ring-accent/60"), 1500);
      }
    });
  }, []);

  const searchParams = useSearchParams();
  const jumpToParam = searchParams?.get("msg") ?? null;
  const jumpedToRef = useRef<string | null>(null);
  useEffect(() => {
    if (!jumpToParam) return;
    if (messages.length === 0) return;
    if (jumpedToRef.current === jumpToParam) return;
    if (!messages.some((m) => m.id === jumpToParam)) return;
    jumpedToRef.current = jumpToParam;
    onJumpTo(jumpToParam);
  }, [jumpToParam, messages, onJumpTo]);

  const callParam = searchParams?.get("call") ?? null;
  const callParamHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (kind !== "dm") return;
    if (callParam !== "1") return;
    const key = `${channelId}:1`;
    if (callParamHandledRef.current === key) return;
    callParamHandledRef.current = key;
    setCallOpen(true);
  }, [channelId, callParam, kind]);

  const runSearch = useCallback(async () => {
    const q = searchValue.trim();
    if (!q) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const fn = kind === "dm" ? searchDmMessages : searchChannelMessages;
    const results = await fn(channelId, q);
    setSearching(false);
    setSearchResults(results);
    if (backfillMissingUsers) {
      const missing = new Set<string>();
      for (const m of results) if (!userMapRef.current[m.authorId]) missing.add(m.authorId);
      await Promise.all([...missing].map(ensureUser));
    }
  }, [kind, channelId, searchValue, backfillMissingUsers, ensureUser]);

  const messagesById = useMemo(() => {
    const map = new Map<string, Message>();
    for (const m of messages) map.set(m.id, m);
    return map;
  }, [messages]);

  const visibleMessages = useMemo(
    () => messages.filter((m) => !blocked.has(m.authorId)),
    [messages, blocked],
  );

  const typingNames = useMemo(() => {
    const ids = Object.keys(typingUsers).filter((id) => !blocked.has(id));
    return ids.map((id) => {
      const u = userMap[id];
      return u?.displayName ?? u?.username ?? "Someone";
    });
  }, [typingUsers, userMap, blocked]);

  const replyToAuthor = replyTo ? userMap[replyTo.authorId] ?? null : null;

  const remoteCallers = useMemo(
    () => callMembers.filter((m) => m.userId !== selfId),
    [callMembers, selfId],
  );
  const showRingingBanner =
    kind === "dm" && !callOpen && remoteCallers.length > 0;

  const Icon = icon === "voice" ? Volume2 : icon === "dm" ? null : Hash;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {Icon ? <Icon className="h-5 w-5 text-text-muted" /> : null}
          <span className="truncate text-sm font-semibold">{title}</span>
          {subtitle ? (
            <>
              <span className="h-4 w-px bg-border" />
              <span className="truncate text-xs text-text-muted">
                {subtitle}
              </span>
            </>
          ) : null}
        </div>
        {showHeaderActions ? (
          <div className="flex items-center gap-3 text-text-muted">
            {kind === "dm" ? (
              <button
                type="button"
                aria-label="Start Voice Call"
                title="Start Voice Call"
                onClick={() => setCallOpen((v) => !v)}
                className={
                  callOpen ? "text-online" : "hover:text-accent"
                }
              >
                <Phone className="h-5 w-5" />
              </button>
            ) : null}
            <div className="relative" ref={notifsRef}>
              <button
                type="button"
                aria-label="Notification Settings"
                onClick={() => {
                  setNotifsOpen((v) => !v);
                  setPinsOpen(false);
                }}
                className={
                  notifLevel === "nothing"
                    ? "text-rose-400 hover:text-rose-300"
                    : "hover:text-accent"
                }
              >
                {notifLevel === "nothing" ? (
                  <BellOff className="h-5 w-5" />
                ) : (
                  <Bell className="h-5 w-5" />
                )}
              </button>
              {notifsOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-72 rounded-md border border-border bg-bg p-1 shadow-lg">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                    Notification Settings
                  </div>
                  <NotifOption
                    label="All Messages"
                    description="You'll receive notifications for every new message."
                    selected={notifLevel === "all"}
                    onClick={() => void onSelectNotifLevel("all")}
                  />
                  <NotifOption
                    label="Only @mentions"
                    description="You'll only get notified when someone mentions you."
                    selected={notifLevel === "mentions"}
                    onClick={() => void onSelectNotifLevel("mentions")}
                  />
                  <NotifOption
                    label="Nothing"
                    description="You won't receive any notifications."
                    selected={notifLevel === "nothing"}
                    onClick={() => void onSelectNotifLevel("nothing")}
                  />
                </div>
              ) : null}
            </div>
            <div className="relative" ref={pinsRef}>
              <button
                type="button"
                aria-label="Pinned Messages"
                onClick={() => {
                  setPinsOpen((v) => !v);
                  setNotifsOpen(false);
                }}
                className="hover:text-accent"
              >
                <Pin className="h-5 w-5" />
              </button>
              {pinsOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 max-h-96 w-80 overflow-y-auto rounded-md border border-border bg-bg shadow-lg">
                  <div className="border-b border-border px-3 py-2 text-sm font-semibold">
                    Pinned Messages
                  </div>
                  {pinsLoading ? (
                    <div className="px-3 py-4 text-xs text-text-muted">
                      Loading…
                    </div>
                  ) : pins.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-text-muted">
                      No pinned messages yet.
                    </div>
                  ) : (
                    <ul>
                      {pins.map((p) => {
                        const a = userMap[p.authorId];
                        const aname =
                          a?.displayName ?? a?.username ?? "Unknown";
                        return (
                          <li key={p.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setPinsOpen(false);
                                onJumpTo(p.id);
                              }}
                              className="flex w-full flex-col gap-1 border-b border-border px-3 py-2 text-left hover:bg-surface"
                            >
                              <div className="flex items-baseline gap-2">
                                <span className="text-sm font-semibold">
                                  {aname}
                                </span>
                                <span className="text-[10px] text-text-dim">
                                  {new Date(p.createdAt).toLocaleDateString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  )}
                                </span>
                              </div>
                              <p className="line-clamp-2 whitespace-pre-wrap break-words text-xs text-text">
                                {previewWithMentions(p.content, userMap) ||
                                  (p.attachments.length > 0
                                    ? "[attachment]"
                                    : "")}
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
            {onToggleMembers ? (
              <button
                type="button"
                aria-label="Toggle Member List"
                onClick={onToggleMembers}
                className={
                  membersOpen
                    ? "text-accent"
                    : "hover:text-accent"
                }
              >
                <UsersRound className="h-5 w-5" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className={
                searchOpen
                  ? "flex items-center gap-1 rounded-md bg-accent/20 px-2 py-1 text-xs text-accent"
                  : "flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-xs hover:text-accent"
              }
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search</span>
            </button>
            <div className="relative" ref={inboxRef}>
              <button
                type="button"
                aria-label="Inbox"
                onClick={() => {
                  setInboxOpen((v) => !v);
                  setNotifsOpen(false);
                  setPinsOpen(false);
                }}
                className="hover:text-accent"
              >
                <Inbox className="h-5 w-5" />
              </button>
              {inboxOpen ? (
                <div className="absolute right-0 top-full z-30 mt-2 w-96 overflow-hidden rounded-md border border-border bg-bg shadow-lg">
                  <div className="flex items-center gap-1 border-b border-border px-2 py-2 text-xs">
                    <InboxTab
                      active={inboxTab === "unreads"}
                      onClick={() => setInboxTab("unreads")}
                    >
                      Unreads
                    </InboxTab>
                    <InboxTab
                      active={inboxTab === "mentions"}
                      onClick={() => setInboxTab("mentions")}
                    >
                      Mentions
                    </InboxTab>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {inboxLoading ? (
                      <div className="px-3 py-4 text-xs text-text-muted">
                        Loading…
                      </div>
                    ) : inboxTab === "unreads" ? (
                      <UnreadsTabBody
                        unreads={inbox.unreads.filter((u) =>
                          kind === "dm"
                            ? u.location.kind === "dm"
                            : u.location.kind === "channel",
                        )}
                        onSelect={() => setInboxOpen(false)}
                      />
                    ) : (
                      <MentionsTabBody
                        mentions={inbox.mentions.filter((m) =>
                          kind === "dm"
                            ? m.location.kind === "dm"
                            : m.location.kind === "channel",
                        )}
                        userMap={userMap}
                        onSelect={() => setInboxOpen(false)}
                      />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      {showRingingBanner ? (
        <div className="flex shrink-0 items-center gap-3 border-b border-border bg-online/10 px-4 py-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-online opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-online" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">
              {remoteCallers
                .map((m) => {
                  const u = userMap[m.userId];
                  return u?.displayName ?? u?.username ?? "Someone";
                })
                .join(", ")}
            </span>
            <span className="text-text-muted">
              {" "}
              {remoteCallers.length === 1 ? "is" : "are"} in a voice call
            </span>
          </div>
          <button
            type="button"
            onClick={() => setCallOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-online px-3 py-1 text-xs font-medium text-bg transition-opacity hover:opacity-90"
          >
            <Phone className="h-3.5 w-3.5" />
            Join Call
          </button>
        </div>
      ) : null}

      {kind === "dm" && callOpen ? (
        <DmCallPanel
          dmId={channelId}
          selfId={selfId}
          users={userMap}
          onClose={() => setCallOpen(false)}
        />
      ) : null}

      {searchOpen ? (
        <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              } else if (e.key === "Escape") {
                setSearchOpen(false);
                setSearchResults(null);
              }
            }}
            placeholder="Search messages…"
            className="flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-muted"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            className="rounded bg-accent px-2 py-1 text-xs font-medium text-bg"
          >
            {searching ? "Searching…" : "Search"}
          </button>
          {searchResults !== null ? (
            <button
              type="button"
              onClick={() => {
                setSearchResults(null);
                setSearchValue("");
              }}
              aria-label="Clear"
              className="rounded p-1 text-text-muted hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-4">
        {searchResults !== null ? (
          <SearchResultsView
            results={searchResults}
            userMap={userMap}
            selfId={selfId}
            onJumpTo={onJumpTo}
          />
        ) : visibleMessages.length === 0 ? (
          <div className="px-4 pt-8 text-sm text-text-muted">
            No messages yet. Say hi.
          </div>
        ) : (
          visibleMessages.map((msg, i) => {
            const prev = visibleMessages[i - 1];
            const author = userMap[msg.authorId];
            const grouped =
              !!prev &&
              prev.authorId === msg.authorId &&
              prev.kind === "default" &&
              msg.kind === "default" &&
              !msg.replyToId &&
              msg.createdAt - prev.createdAt < GROUP_WINDOW_MS;
            const replied = msg.replyToId
              ? messagesById.get(msg.replyToId) ?? null
              : null;
            const repliedAuthor = replied ? userMap[replied.authorId] : undefined;
            const showCutoff =
              cutoffAt > 0 &&
              msg.createdAt > cutoffAt &&
              msg.authorId !== selfId &&
              (!prev || prev.createdAt <= cutoffAt);
            return (
              <div key={msg.id}>
                {showCutoff ? <UnreadDivider /> : null}
                <MessageBubble
                  message={msg}
                  author={author}
                  grouped={grouped && !showCutoff}
                  kind={kind}
                  selfId={selfId}
                  users={userMap}
                  repliedTo={replied}
                  repliedAuthor={repliedAuthor}
                  canPin={canPin}
                  canDeleteOthers={canDeleteOthers}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReact={onReact}
                  onJumpTo={onJumpTo}
                  onPin={onTogglePin}
                  onOpenPins={() => setPinsOpen(true)}
                />
              </div>
            );
          })
        )}
      </div>

      {typingNames.length > 0 ? (
        <div className="h-5 px-4 text-[11px] italic text-text-muted">
          {formatTypingText(typingNames)}
        </div>
      ) : (
        <div className="h-5" aria-hidden />
      )}

      <Composer
        channelId={channelId}
        kind={kind}
        placeholder={composerPlaceholder}
        replyTo={replyTo}
        replyToAuthor={replyToAuthor}
        onCancelReply={() => setReplyTo(null)}
        mentionables={(mentionables ?? Object.values(userMap).filter((u) => u.id !== selfId)).filter(
          (u) => !blocked.has(u.id),
        )}
        canMentionEveryone={canMentionEveryone}
      />
    </div>
  );
}

function InboxTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-accent/20 px-3 py-1 text-accent"
          : "rounded-md px-3 py-1 text-text-muted hover:bg-surface hover:text-text"
      }
    >
      {children}
    </button>
  );
}

function inboxHref(
  loc: import("@/lib/types").InboxLocation,
  messageId?: string,
): string {
  const base =
    loc.kind === "dm"
      ? `/channels/me/${loc.id}`
      : `/channels/${loc.serverId}/${loc.id}`;
  return messageId ? `${base}?msg=${encodeURIComponent(messageId)}` : base;
}

function inboxLocLabel(loc: import("@/lib/types").InboxLocation): string {
  if (loc.kind === "dm") return loc.name;
  return `${loc.serverName} · #${loc.name}`;
}

function UnreadsTabBody({
  unreads,
  onSelect,
}: {
  unreads: import("@/lib/types").InboxUnread[];
  onSelect: () => void;
}) {
  if (unreads.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-xs text-text-muted">
        You&apos;re all caught up.
      </div>
    );
  }
  return (
    <ul>
      {unreads.map((u) => (
        <li key={u.location.id}>
          <Link
            href={inboxHref(u.location)}
            onClick={onSelect}
            className="flex items-center gap-2 border-b border-border px-3 py-2 hover:bg-surface"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {inboxLocLabel(u.location)}
              </div>
              <div className="text-[11px] text-text-muted">
                {u.unreadCount} new {u.unreadCount === 1 ? "message" : "messages"}
              </div>
            </div>
            {u.mentionCount > 0 ? (
              <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-bold text-bg">
                @{u.mentionCount}
              </span>
            ) : (
              <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                {u.unreadCount}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MentionsTabBody({
  mentions,
  userMap,
  onSelect,
}: {
  mentions: import("@/lib/types").InboxMention[];
  userMap: UserMap;
  onSelect: () => void;
}) {
  if (mentions.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-xs text-text-muted">
        No mentions yet.
      </div>
    );
  }
  return (
    <ul>
      {mentions.map((m) => {
        const author = userMap[m.message.authorId];
        const aname =
          author?.displayName ?? author?.username ?? "Someone";
        return (
          <li key={m.message.id}>
            <Link
              href={inboxHref(m.location, m.message.id)}
              onClick={onSelect}
              className="flex flex-col gap-1 border-b border-border px-3 py-2 hover:bg-surface"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{aname}</span>
                <span className="text-[10px] text-text-dim">
                  {inboxLocLabel(m.location)}
                </span>
                <span className="ml-auto text-[10px] text-text-dim">
                  {new Date(m.message.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="line-clamp-2 whitespace-pre-wrap break-words text-xs text-text">
                {previewWithMentions(m.message.content, userMap) ||
                  (m.message.attachments.length > 0 ? "[attachment]" : "")}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function NotifOption({
  label,
  description,
  selected,
  onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left ${selected ? "bg-surface" : "hover:bg-surface"}`}
    >
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {selected ? <Check className="h-4 w-4 text-accent" /> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-[11px] text-text-muted">{description}</div>
      </div>
    </button>
  );
}

function UnreadDivider() {
  return (
    <div className="my-1 flex items-center gap-2 px-4">
      <div className="h-px flex-1 bg-danger" />
      <span className="rounded-sm bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg">
        New
      </span>
    </div>
  );
}

function formatTypingText(names: string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  if (names.length === 3)
    return `${names[0]}, ${names[1]}, and ${names[2]} are typing…`;
  return "Several people are typing…";
}

function applyReaction(
  m: Message,
  emoji: string,
  userId: string,
  action: "add" | "remove",
): Message {
  const next = m.reactions.map((r) => ({
    ...r,
    userIds: [...r.userIds],
  }));
  const idx = next.findIndex((r) => r.emoji === emoji);
  if (action === "add") {
    if (idx === -1) {
      next.push({ emoji, count: 1, userIds: [userId] });
    } else if (!next[idx].userIds.includes(userId)) {
      next[idx].userIds.push(userId);
      next[idx].count = next[idx].userIds.length;
    }
  } else {
    if (idx !== -1) {
      next[idx].userIds = next[idx].userIds.filter((u) => u !== userId);
      next[idx].count = next[idx].userIds.length;
      if (next[idx].count === 0) next.splice(idx, 1);
    }
  }
  return { ...m, reactions: next };
}

function SearchResultsView({
  results,
  userMap,
  selfId,
  onJumpTo,
}: {
  results: Message[];
  userMap: UserMap;
  selfId: string;
  onJumpTo: (messageId: string) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="px-4 pt-8 text-sm text-text-muted">
        No matches.
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      <div className="px-4 pt-3 text-xs uppercase tracking-wide text-text-muted">
        {results.length} result{results.length === 1 ? "" : "s"}
      </div>
      {results.map((msg) => {
        const author = userMap[msg.authorId];
        const name = author?.displayName ?? author?.username ?? "Unknown";
        const mine = msg.authorId === selfId;
        return (
          <button
            key={msg.id}
            type="button"
            onClick={() => onJumpTo(msg.id)}
            className="mx-4 mt-2 flex flex-col gap-1 rounded-md border border-border bg-surface px-3 py-2 text-left hover:border-accent/60"
          >
            <div className="flex items-baseline gap-2">
              <span
                className={
                  mine
                    ? "text-sm font-semibold text-accent"
                    : "text-sm font-semibold text-text"
                }
              >
                {name}
              </span>
              <span className="text-[11px] text-text-dim">
                {new Date(msg.createdAt).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm text-text">
              {previewWithMentions(msg.content, userMap) ||
                (msg.attachments.length > 0 ? "[attachment]" : "")}
            </p>
          </button>
        );
      })}
    </div>
  );
}
