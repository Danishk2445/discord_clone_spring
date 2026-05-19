"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Paperclip, Reply, Send, Smile, X } from "lucide-react";
import {
  sendChannelMessage,
  sendDmMessage,
  uploadFile,
  type SendMessageInput,
} from "@/lib/client-api";
import { sendTyping } from "@/lib/realtime";
import type {
  Attachment,
  ChannelKindForChat,
  Message,
  PublicUser,
  SelfUser,
} from "@/lib/types";
import { EmojiPicker } from "./EmojiPicker";

type AnyUser = PublicUser | SelfUser;
type MentionEntry =
  | { kind: "user"; user: AnyUser }
  | { kind: "broadcast"; id: "@everyone" | "@here"; label: string; description: string };

export function Composer({
  channelId,
  kind,
  placeholder,
  onSent,
  replyTo,
  replyToAuthor,
  onCancelReply,
  mentionables = [],
  canMentionEveryone = false,
}: {
  channelId: string;
  kind: ChannelKindForChat;
  placeholder: string;
  onSent?: (message: Message) => void;
  replyTo?: Message | null;
  replyToAuthor?: AnyUser | null;
  onCancelReply?: () => void;
  mentionables?: AnyUser[];
  canMentionEveryone?: boolean;
}) {
  const [value, setValue] = useState("");
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<number>(0);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiWrapRef = useRef<HTMLDivElement>(null);
  const pickedMentions = useRef<{ token: string; userId: string }[]>([]);
  const pickedBroadcasts = useRef<Set<"@everyone" | "@here">>(new Set());

  const submit = useCallback(async () => {
    const rawText = value.trim();
    if ((!rawText && attachments.length === 0) || sending) return;
    setSending(true);
    const { content, mentions } = serializeMentions(
      rawText,
      pickedMentions.current,
      mentionables,
      pickedBroadcasts.current,
      canMentionEveryone,
    );
    const input: SendMessageInput = {
      content,
      replyToId: replyTo?.id ?? null,
      attachments,
      mentions,
    };
    const sender = kind === "dm" ? sendDmMessage : sendChannelMessage;
    const message = await sender(channelId, input);
    setSending(false);
    if (message) {
      setValue("");
      setAttachments([]);
      setMentionQuery(null);
      pickedMentions.current = [];
      pickedBroadcasts.current = new Set();
      onCancelReply?.();
      onSent?.(message);
    }
  }, [value, attachments, sending, kind, channelId, replyTo, mentionables, canMentionEveryone, onCancelReply, onSent]);

  const onValueChange = (next: string, caret: number) => {
    setValue(next);
    if (next.trim().length > 0) sendTyping(channelId);
    const upToCaret = next.slice(0, caret);
    const at = upToCaret.lastIndexOf("@");
    if (at === -1) {
      setMentionQuery(null);
      return;
    }
    const before = at === 0 ? "" : upToCaret[at - 1];
    if (before && !/\s/.test(before)) {
      setMentionQuery(null);
      return;
    }
    const query = upToCaret.slice(at + 1);
    if (/\s/.test(query) || query.length > 32) {
      setMentionQuery(null);
      return;
    }
    setMentionAnchor(at);
    setMentionQuery(query);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && mentionQuery !== null) {
      e.preventDefault();
      setMentionQuery(null);
      return;
    }
    if (e.key === "Escape" && replyTo) {
      e.preventDefault();
      onCancelReply?.();
      return;
    }
    if (
      mentionQuery !== null &&
      filteredMentions.length > 0 &&
      (e.key === "Enter" || e.key === "Tab")
    ) {
      e.preventDefault();
      insertMentionEntry(filteredMentions[0]);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
      e.preventDefault();
      void submit();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const insertMentionEntry = (entry: MentionEntry) => {
    const ta = textareaRef.current;
    const caret = ta?.selectionStart ?? value.length;
    const before = value.slice(0, mentionAnchor);
    const after = value.slice(caret);
    let token: string;
    if (entry.kind === "user") {
      const name = entry.user.displayName || entry.user.username;
      token = `@${name}`;
      pickedMentions.current.push({ token, userId: entry.user.id });
    } else {
      token = entry.id;
      pickedBroadcasts.current.add(entry.id);
    }
    const next = before + token + " " + after;
    setValue(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const newCaret = (before + token + " ").length;
      ta?.setSelectionRange(newCaret, newCaret);
      ta?.focus();
    });
  };

  const filteredMentions = useMemo<MentionEntry[]>(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    const broadcast: MentionEntry[] =
      kind === "channel" && canMentionEveryone
        ? (
            [
              { id: "@everyone" as const, label: "@everyone", description: "Notify everyone in this channel" },
              { id: "@here" as const, label: "@here", description: "Notify only online members" },
            ]
              .filter((b) =>
                q === "" ? true : b.label.toLowerCase().slice(1).startsWith(q),
              )
              .map((b) => ({ kind: "broadcast", id: b.id, label: b.label, description: b.description }))
          )
        : [];
    const users: MentionEntry[] = mentionables
      .filter((u) =>
        (u.displayName ?? u.username ?? "").toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
      )
      .map((u) => ({ kind: "user" as const, user: u }));
    return [...broadcast, ...users].slice(0, 8);
  }, [mentionQuery, mentionables, kind, canMentionEveryone]);

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + emoji + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      const newCaret = start + emoji.length;
      ta?.focus();
      ta?.setSelectionRange(newCaret, newCaret);
    });
  };

  useEffect(() => {
    if (!emojiOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!emojiWrapRef.current?.contains(e.target as Node)) setEmojiOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [emojiOpen]);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const attached = await uploadFile(file);
    setUploading(false);
    if (attached) {
      setAttachments((prev) => [...prev, attached]);
    } else {
      alert("Upload failed.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  useEffect(() => {
    if (replyTo) textareaRef.current?.focus();
  }, [replyTo]);

  return (
    <form onSubmit={onSubmit} className="px-4 pb-6 pt-2">
      {replyTo ? (
        <div className="mb-1 flex items-center justify-between rounded-t-md border border-b-0 border-border bg-surface px-3 py-1 text-xs text-text-muted">
          <span className="flex items-center gap-1.5 truncate">
            <Reply className="h-3.5 w-3.5" />
            Replying to{" "}
            <span className="font-medium text-text">
              @{replyToAuthor?.displayName ?? replyToAuthor?.username ?? "unknown"}
            </span>
          </span>
          <button
            type="button"
            onClick={onCancelReply}
            aria-label="Cancel reply"
            className="rounded p-0.5 hover:bg-bg hover:text-text"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      {attachments.length > 0 ? (
        <div className="mb-1 flex flex-wrap gap-2 rounded-md border border-border bg-surface px-3 py-2">
          {attachments.map((a, i) => (
            <span
              key={`${a.url}-${i}`}
              className="flex items-center gap-1 rounded bg-bg px-2 py-1 text-xs text-text"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[12rem] truncate">{a.name}</span>
              <button
                type="button"
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, idx) => idx !== i))
                }
                aria-label="Remove attachment"
                className="text-text-muted hover:text-rose-400"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="relative">
        {filteredMentions.length > 0 ? (
          <div className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-md border border-border bg-bg shadow">
            {filteredMentions.map((entry) =>
              entry.kind === "user" ? (
                <button
                  key={`u-${entry.user.id}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMentionEntry(entry);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-surface"
                >
                  <span className="truncate font-medium text-text">
                    {entry.user.displayName ?? entry.user.username}
                  </span>
                  <span className="text-xs text-text-muted">@{entry.user.username}</span>
                </button>
              ) : (
                <button
                  key={`b-${entry.id}`}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMentionEntry(entry);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-surface"
                >
                  <span className="truncate font-semibold text-accent">
                    {entry.label}
                  </span>
                  <span className="truncate text-xs text-text-muted">
                    {entry.description}
                  </span>
                </button>
              ),
            )}
          </div>
        ) : null}

        <div
          className={
            replyTo
              ? "flex items-end gap-2 rounded-b-2xl border border-border bg-surface px-3 py-2 focus-within:border-accent/40"
              : "flex items-end gap-2 rounded-2xl border border-border bg-surface px-3 py-2 focus-within:border-accent/40"
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void onFileChosen(e.target.files?.[0])}
          />
          <button
            type="button"
            aria-label="Attach"
            onClick={onPickFile}
            disabled={uploading}
            className="mb-1 text-text-muted transition-colors hover:text-accent disabled:opacity-40"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) =>
              onValueChange(e.target.value, e.target.selectionStart ?? 0)
            }
            onKeyUp={(e) => {
              const ta = e.currentTarget;
              onValueChange(ta.value, ta.selectionStart ?? 0);
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="max-h-40 flex-1 resize-none bg-transparent py-1 text-sm text-text outline-none placeholder:text-text-muted"
          />
          <div className="relative mb-1" ref={emojiWrapRef}>
            <button
              type="button"
              aria-label="Emoji"
              onClick={() => setEmojiOpen((v) => !v)}
              className={
                emojiOpen
                  ? "text-accent"
                  : "text-text-muted transition-colors hover:text-accent"
              }
            >
              <Smile className="h-5 w-5" />
            </button>
            {emojiOpen ? (
              <div className="absolute bottom-full right-0 z-30 mb-2">
                <EmojiPicker
                  onSelect={(emoji) => {
                    insertEmoji(emoji);
                    setEmojiOpen(false);
                  }}
                />
              </div>
            ) : null}
          </div>
          <button
            type="submit"
            aria-label="Send"
            disabled={(!value.trim() && attachments.length === 0) || sending}
            className="mb-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-accent text-bg transition-opacity disabled:opacity-30"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </form>
  );
}

function serializeMentions(
  text: string,
  picked: { token: string; userId: string }[],
  mentionables: AnyUser[],
  pickedBroadcasts: Set<"@everyone" | "@here">,
  canMentionEveryone: boolean,
): { content: string; mentions: string[] } {
  const ids = new Set<string>();
  let content = text;

  const remaining = [...picked].sort((a, b) => b.token.length - a.token.length);
  const consumed = new Set<number>();
  for (let i = 0; i < remaining.length; i++) {
    if (consumed.has(i)) continue;
    const { token, userId } = remaining[i];
    const idx = content.indexOf(token);
    if (idx === -1) continue;
    content =
      content.slice(0, idx) + `<@${userId}>` + content.slice(idx + token.length);
    ids.add(userId);
    consumed.add(i);
  }

  const sorted = mentionables
    .map((u) => ({ user: u, name: u.displayName || u.username }))
    .sort((a, b) => b.name.length - a.name.length);
  for (const { user, name } of sorted) {
    const needle = `@${name}`;
    let from = 0;
    while (true) {
      const idx = content.indexOf(needle, from);
      if (idx === -1) break;
      const before = idx === 0 ? "" : content[idx - 1];
      const after = content[idx + needle.length] ?? "";
      const boundaryOk =
        (before === "" || /\s/.test(before)) &&
        (after === "" || !/[a-zA-Z0-9_-]/.test(after));
      if (boundaryOk) {
        content =
          content.slice(0, idx) +
          `<@${user.id}>` +
          content.slice(idx + needle.length);
        ids.add(user.id);
        from = idx + `<@${user.id}>`.length;
      } else {
        from = idx + needle.length;
      }
    }
  }

  if (canMentionEveryone) {
    if (pickedBroadcasts.has("@everyone") || /(^|\s)@everyone(\s|$|[^\w-])/.test(content)) {
      ids.add("@everyone");
    }
    if (pickedBroadcasts.has("@here") || /(^|\s)@here(\s|$|[^\w-])/.test(content)) {
      ids.add("@here");
    }
  }
  return { content, mentions: [...ids] };
}
