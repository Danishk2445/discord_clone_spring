"use client";

import { useState } from "react";
import { ChatView } from "./ChatView";
import { MembersPanel } from "./MembersPanel";
import type {
  NotificationLevel,
  PublicUser,
  SelfUser,
} from "@/lib/types";

type UserMap = Record<string, PublicUser | SelfUser>;

export function ChannelView({
  serverId,
  channelId,
  title,
  subtitle,
  icon,
  composerPlaceholder,
  users,
  selfId,
  mentionables,
  blockedUserIds,
  canPin,
  canDeleteOthers,
  canMentionEveryone,
  initialNotificationLevel,
}: {
  serverId: string;
  channelId: string;
  title: string;
  subtitle?: string;
  icon: "hash" | "voice";
  composerPlaceholder: string;
  users: UserMap;
  selfId: string;
  mentionables: (PublicUser | SelfUser)[];
  blockedUserIds: string[];
  canPin: boolean;
  canDeleteOthers: boolean;
  canMentionEveryone: boolean;
  initialNotificationLevel: NotificationLevel;
}) {
  const [showMembers, setShowMembers] = useState(true);
  return (
    <div className="flex h-full min-w-0 flex-1">
      <div className="flex min-w-0 flex-1">
        <ChatView
          channelId={channelId}
          kind="channel"
          title={title}
          subtitle={subtitle}
          icon={icon}
          composerPlaceholder={composerPlaceholder}
          users={users}
          backfillMissingUsers
          selfId={selfId}
          mentionables={mentionables}
          blockedUserIds={blockedUserIds}
          membersOpen={showMembers}
          onToggleMembers={() => setShowMembers((v) => !v)}
          canPin={canPin}
          canDeleteOthers={canDeleteOthers}
          canMentionEveryone={canMentionEveryone}
          initialNotificationLevel={initialNotificationLevel}
        />
      </div>
      {showMembers ? <MembersPanel serverId={serverId} selfId={selfId} /> : null}
    </div>
  );
}
