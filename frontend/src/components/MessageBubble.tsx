"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  CornerUpRight,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";
import { Avatar } from "./Avatar";
import { InviteEmbed, extractInviteCodes } from "./InviteEmbed";
import { UserCard } from "./UserCard";
import { API_BASE } from "@/lib/api-base";
import { MENTION_RE, previewWithMentions } from "@/lib/mentions";
import type {
  Attachment,
  ChannelKindForChat,
  Message,
  PublicUser,
  ReactionSummary,
  SelfUser,
} from "@/lib/types";

function attachmentUrl(url: string): string {
  return url.startsWith("/uploads/") ? `${API_BASE}${url}` : url;
}

type AnyUser = PublicUser | SelfUser;

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "👀"];

export function MessageBubble({
  message,
  author,
  grouped,
  kind,
  selfId,
  users,
  repliedTo,
  repliedAuthor,
  canPin = false,
  canDeleteOthers = false,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onJumpTo,
  onPin,
  onOpenPins,
}: {
  message: Message;
  author: AnyUser | undefined;
  grouped: boolean;
  kind: ChannelKindForChat;
  selfId: string;
  users: Record<string, AnyUser>;
  repliedTo: Message | null;
  repliedAuthor: AnyUser | undefined;
  canPin?: boolean;
  canDeleteOthers?: boolean;
  onReply?: (message: Message) => void;
  onEdit?: (messageId: string, content: string, mentions: string[]) => Promise<boolean>;
  onDelete?: (message: Message) => void;
  onReact?: (message: Message, emoji: string, mine: boolean) => void;
  onJumpTo?: (messageId: string) => void;
  onPin?: (message: Message, pinned: boolean) => void;
  onOpenPins?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openCard = () => {
    if (author) setCardOpen(true);
  };

  useEffect(() => {
    if (!pickerOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const name = author?.displayName || author?.username || "Unknown";
  const time = formatTime(message.createdAt);
  const deleted = message.deletedAt !== null;
  const isMine = message.authorId === selfId;
  void kind;
  const showActions = !deleted && !editing && message.kind !== "pin";

  if (message.kind === "pin") {
    return (
      <SystemPinRow
        message={message}
        actorName={name}
        repliedTo={repliedTo}
        onJumpTo={onJumpTo}
        onOpenPins={onOpenPins}
      />
    );
  }

  const body = (
    <>
      {repliedTo ? (
        <button
          type="button"
          onClick={() => onJumpTo?.(repliedTo.id)}
          className="mb-1 flex max-w-full items-center gap-1.5 truncate text-left text-xs text-text-muted hover:text-text"
        >
          <CornerUpRight className="h-3 w-3 shrink-0 -scale-y-100" />
          <span className="font-medium text-text">
            @{repliedAuthor?.displayName ?? repliedAuthor?.username ?? "unknown"}
          </span>
          <span className="truncate opacity-80">
            {repliedTo.deletedAt
              ? "(message deleted)"
              : previewWithMentions(repliedTo.content, users) ||
                (repliedTo.attachments.length > 0 ? "[attachment]" : "")}
          </span>
        </button>
      ) : null}
      {editing ? (
        <EditBox
          message={message}
          users={users}
          onCancel={() => setEditing(false)}
          onSave={async (content, mentions) => {
            if (!onEdit) return;
            const ok = await onEdit(message.id, content, mentions);
            if (ok) setEditing(false);
          }}
        />
      ) : deleted ? (
        <p className="italic text-sm text-text-dim">Message deleted</p>
      ) : (
        <>
          <MessageContent content={message.content} users={users} selfId={selfId} />
          {message.editedAt ? (
            <span className="ml-1 text-[10px] text-text-dim">(edited)</span>
          ) : null}
          {extractInviteCodes(message.content).map((code) => (
            <InviteEmbed key={code} code={code} />
          ))}
          {message.attachments.length > 0 ? (
            <AttachmentList attachments={message.attachments} />
          ) : null}
          {message.reactions.length > 0 ? (
            <ReactionRow
              reactions={message.reactions}
              selfId={selfId}
              onReact={(emoji, mine) => onReact?.(message, emoji, mine)}
            />
          ) : null}
        </>
      )}
    </>
  );

  const canEdit = isMine;
  const canDelete = isMine || canDeleteOthers;
  const pinned = message.pinnedAt !== null;
  const hasMenu = canPin || canEdit || canDelete;

  const actions = showActions ? (
    <div className="absolute right-3 -top-3 z-10 hidden gap-0.5 rounded-md border border-border bg-bg p-0.5 shadow group-hover:flex">
      <button
        type="button"
        aria-label="Add reaction"
        onClick={() => setPickerOpen((v) => !v)}
        className="rounded p-1 text-text-muted hover:bg-surface hover:text-accent"
      >
        <SmilePlus className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="Reply"
        onClick={() => onReply?.(message)}
        className="rounded p-1 text-text-muted hover:bg-surface hover:text-accent"
      >
        <Reply className="h-4 w-4" />
      </button>
      {hasMenu ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More"
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-1 text-text-muted hover:bg-surface hover:text-accent"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-bg py-1 text-sm shadow">
              {canPin ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onPin?.(message, !pinned);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface"
                >
                  {pinned ? (
                    <>
                      <PinOff className="h-4 w-4" />
                      Unpin Message
                    </>
                  ) : (
                    <>
                      <Pin className="h-4 w-4" />
                      Pin Message
                    </>
                  )}
                </button>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditing(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-surface"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Message
                </button>
              ) : null}
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm("Delete this message?")) onDelete?.(message);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-rose-400 hover:bg-surface"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Message
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {pickerOpen ? (
        <div
          ref={pickerRef}
          className="absolute right-0 top-full mt-1 flex gap-1 rounded-md border border-border bg-bg p-1 shadow"
        >
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => {
                onReact?.(
                  message,
                  e,
                  message.reactions.some(
                    (r) => r.emoji === e && r.userIds.includes(selfId),
                  ),
                );
                setPickerOpen(false);
              }}
              className="rounded px-1.5 py-0.5 text-base hover:bg-surface"
            >
              {e}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  ) : null;

  const card =
    author && cardOpen ? (
      <UserCard
        open
        onClose={() => setCardOpen(false)}
        user={author}
        selfId={selfId}
      />
    ) : null;

  if (grouped && !repliedTo) {
    return (
      <div
        id={`msg-${message.id}`}
        className="group relative flex gap-3 px-4 hover:bg-surface/70"
      >
        <div className="w-10 shrink-0 text-right text-[10px] leading-6 text-text-dim opacity-0 group-hover:opacity-100">
          {formatHourMinute(message.createdAt)}
        </div>
        <div className="min-w-0 flex-1 py-0.5 text-sm text-text">{body}</div>
        {actions}
        {card}
      </div>
    );
  }

  return (
    <div
      id={`msg-${message.id}`}
      className="group relative flex gap-3 px-4 pt-4 hover:bg-surface/70"
    >
      <button
        type="button"
        onClick={openCard}
        disabled={!author}
        aria-label={`Open profile for ${name}`}
        className="shrink-0 rounded-full outline-none focus:ring-2 focus:ring-accent/60 disabled:cursor-default"
      >
        <Avatar
          name={name}
          color={author?.avatarColor ?? "#444"}
          imageUrl={author?.avatarUrl ?? null}
          size="lg"
        />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <button
            type="button"
            onClick={openCard}
            disabled={!author}
            className="text-sm font-semibold text-text hover:underline disabled:cursor-default disabled:hover:no-underline"
          >
            {name}
          </button>
          <span className="text-[11px] text-text-dim">{time}</span>
        </div>
        <div className="text-sm text-text">{body}</div>
      </div>
      {actions}
      {card}
    </div>
  );
}

function SystemPinRow({
  message,
  actorName,
  repliedTo,
  onJumpTo,
  onOpenPins,
}: {
  message: Message;
  actorName: string;
  repliedTo: Message | null;
  onJumpTo?: (id: string) => void;
  onOpenPins?: () => void;
}) {
  return (
    <div
      id={`msg-${message.id}`}
      className="group relative flex items-center gap-2 px-4 py-1 text-[13px] text-text-muted"
    >
      <Pin className="h-3.5 w-3.5 shrink-0 text-text-dim" />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-text">{actorName}</span>
        {" pinned "}
        {repliedTo ? (
          <button
            type="button"
            onClick={() => onJumpTo?.(repliedTo.id)}
            className="underline-offset-2 hover:text-text hover:underline"
          >
            a message
          </button>
        ) : (
          <span>a message</span>
        )}
        {" to this channel. "}
        <button
          type="button"
          onClick={() => onOpenPins?.()}
          className="underline-offset-2 hover:text-text hover:underline"
        >
          See all pinned messages.
        </button>
      </div>
      <span className="ml-2 shrink-0 text-[11px] text-text-dim opacity-0 group-hover:opacity-100">
        {formatHourMinute(message.createdAt)}
      </span>
    </div>
  );
}

function MessageContent({
  content,
  users,
  selfId,
}: {
  content: string;
  users: Record<string, AnyUser>;
  selfId: string;
}) {
  if (!content) return null;
  const parts = renderWithMentions(content, users, selfId);
  return (
    <span className="whitespace-pre-wrap break-words">{parts}</span>
  );
}

function renderWithMentions(
  content: string,
  users: Record<string, AnyUser>,
  selfId: string,
) {
  const out: React.ReactNode[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  MENTION_RE.lastIndex = 0;
  let key = 0;
  while ((m = MENTION_RE.exec(content)) !== null) {
    if (m.index > lastIndex) {
      out.push(content.slice(lastIndex, m.index));
    }
    const userId = m[1];
    const everyone = m[2];
    if (everyone) {
      out.push(
        <span
          key={`m-${key++}`}
          className="rounded bg-accent/30 px-1 font-medium text-accent"
        >
          {everyone}
        </span>,
      );
    } else {
      const user = users[userId];
      const label = user?.displayName ?? user?.username ?? userId;
      const mine = userId === selfId;
      out.push(
        <span
          key={`m-${key++}`}
          className={
            mine
              ? "rounded bg-accent/30 px-1 font-medium text-accent"
              : "rounded bg-accent/10 px-1 font-medium text-accent"
          }
        >
          @{label}
        </span>,
      );
    }
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < content.length) out.push(content.slice(lastIndex));
  return out;
}

function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  return (
    <div className="mt-1 flex flex-col gap-1">
      {attachments.map((a) => (
        <AttachmentItem key={a.url} attachment={a} />
      ))}
    </div>
  );
}

function AttachmentItem({ attachment }: { attachment: Attachment }) {
  const href = attachmentUrl(attachment.url);
  const isImage =
    (attachment.contentType?.startsWith("image/") ?? false) ||
    /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(attachment.url);
  if (isImage) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block max-w-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={href}
          alt={attachment.name}
          className="max-h-80 rounded-md border border-border object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-accent hover:bg-surface/80"
    >
      <span className="truncate max-w-[18rem]">{attachment.name}</span>
    </a>
  );
}

function ReactionRow({
  reactions,
  selfId,
  onReact,
}: {
  reactions: ReactionSummary[];
  selfId: string;
  onReact: (emoji: string, mine: boolean) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {reactions.map((r) => {
        const mine = r.userIds.includes(selfId);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onReact(r.emoji, mine)}
            className={
              mine
                ? "flex items-center gap-1 rounded-full border border-accent bg-accent/20 px-2 py-0.5 text-xs"
                : "flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-xs hover:border-accent/60"
            }
          >
            <span>{r.emoji}</span>
            <span className="text-text-muted">{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function EditBox({
  message,
  users,
  onCancel,
  onSave,
}: {
  message: Message;
  users: Record<string, AnyUser>;
  onCancel: () => void;
  onSave: (content: string, mentions: string[]) => void;
}) {
  const [value, setValue] = useState(message.content);
  void users;
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) return;
      onSave(trimmed, extractMentionIds(trimmed));
    }
  };
  return (
    <div className="mt-1 flex flex-col gap-1">
      <textarea
        autoFocus
        rows={Math.min(6, Math.max(1, value.split("\n").length))}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        className="w-full resize-none rounded-md border border-border bg-surface px-2 py-1 text-sm text-text outline-none focus:border-accent/60"
      />
      <div className="text-[11px] text-text-muted">
        escape to cancel · enter to save
      </div>
    </div>
  );
}

function extractMentionIds(content: string): string[] {
  const ids = new Set<string>();
  MENTION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_RE.exec(content)) !== null) ids.add(m[1]);
  return [...ids];
}

function formatTime(ts: number) {
  const date = new Date(ts);
  const now = Date.now();
  const sameDay = new Date(now).toDateString() === date.toDateString();
  if (sameDay) return `Today at ${formatHourMinute(ts)}`;
  const yesterday = new Date(now - 86400000).toDateString() === date.toDateString();
  if (yesterday) return `Yesterday at ${formatHourMinute(ts)}`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHourMinute(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
