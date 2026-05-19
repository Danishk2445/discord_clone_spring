import { notFound, redirect } from "next/navigation";
import { ChannelView } from "@/components/ChannelView";
import { VoiceChannelView } from "@/components/VoiceChannelView";
import {
  getChannel,
  getMe,
  getMyBlocks,
  getNotificationLevels,
  getServerMembership,
  getServerWithChannels,
  listFriends,
  listMembers,
  listRoles,
} from "@/lib/server-api";
import { PERM } from "@/lib/types";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const { serverId, channelId } = await params;
  const me = await getMe();
  if (!me) redirect("/login");

  const [
    channel,
    serverData,
    friends,
    members,
    blockedUserIds,
    membership,
    roles,
    notifLevels,
  ] = await Promise.all([
    getChannel(channelId),
    getServerWithChannels(serverId),
    listFriends("all"),
    listMembers(serverId),
    getMyBlocks(),
    getServerMembership(serverId),
    listRoles(serverId),
    getNotificationLevels(),
  ]);
  if (!channel || !serverData) notFound();

  const usersMap = Object.fromEntries(friends.map((f) => [f.user.id, f.user]));
  usersMap[me.id] = me;
  for (const m of members) {
    if (!usersMap[m.user.id]) usersMap[m.user.id] = m.user;
  }

  const isOwner = !!membership?.isOwner;
  const myRoleIds = new Set(membership?.roleIds ?? []);
  let permissions = 0;
  for (const r of roles) {
    if (r.isEveryone || myRoleIds.has(r.id)) permissions |= r.permissions;
  }
  const canManageMessages =
    isOwner || (permissions & PERM.MANAGE_MESSAGES) !== 0;
  const canMentionEveryone =
    isOwner || (permissions & PERM.MENTION_EVERYONE) !== 0;

  if (channel.kind === "voice") {
    return (
      <VoiceChannelView
        serverId={serverId}
        channelId={channel.id}
        title={channel.name}
        subtitle={channel.topic ?? undefined}
        composerPlaceholder={`Message #${channel.name}`}
        users={usersMap}
        selfId={me.id}
        mentionables={members.map((m) => m.user).filter((u) => u.id !== me.id)}
        blockedUserIds={blockedUserIds}
        canPin={canManageMessages}
        canDeleteOthers={canManageMessages}
        canMentionEveryone={canMentionEveryone}
        initialNotificationLevel={notifLevels[channel.id] ?? "all"}
      />
    );
  }

  return (
    <ChannelView
      serverId={serverId}
      channelId={channel.id}
      title={channel.name}
      subtitle={channel.topic ?? undefined}
      icon="hash"
      composerPlaceholder={`Message #${channel.name}`}
      users={usersMap}
      selfId={me.id}
      mentionables={members.map((m) => m.user).filter((u) => u.id !== me.id)}
      blockedUserIds={blockedUserIds}
      canPin={canManageMessages}
      canDeleteOthers={canManageMessages}
      canMentionEveryone={canMentionEveryone}
      initialNotificationLevel={notifLevels[channel.id] ?? "all"}
    />
  );
}
