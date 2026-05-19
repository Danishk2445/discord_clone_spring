import type { PublicUser, SelfUser } from "@/lib/types";

export const MENTION_RE = /<@([a-zA-Z0-9_-]+)>|(@everyone|@here)\b/g;

type AnyUser = PublicUser | SelfUser;

export function previewWithMentions(
  content: string,
  users: Record<string, AnyUser>,
): string {
  if (!content) return "";
  return content.replace(MENTION_RE, (_, id, everyone) => {
    if (everyone) return everyone;
    const u = users[id];
    return `@${u?.displayName ?? u?.username ?? id}`;
  });
}
