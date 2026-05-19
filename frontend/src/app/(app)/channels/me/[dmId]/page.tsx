import { notFound, redirect } from "next/navigation";
import { ChatView } from "@/components/ChatView";
import {
  getDM,
  getMe,
  getMyBlocks,
  getNotificationLevels,
  getUser,
  listFriends,
} from "@/lib/server-api";

export default async function DMPage({
  params,
}: {
  params: Promise<{ dmId: string }>;
}) {
  const { dmId } = await params;
  const me = await getMe();
  if (!me) redirect("/login");

  const dm = await getDM(dmId);
  if (!dm) notFound();

  const [friends, blockedUserIds, notifLevels] = await Promise.all([
    listFriends("all"),
    getMyBlocks(),
    getNotificationLevels(),
  ]);
  const usersMap = Object.fromEntries(friends.map((f) => [f.user.id, f.user]));
  usersMap[me.id] = me;
  for (const pid of dm.participantIds) {
    if (!usersMap[pid]) {
      const u = await getUser(pid);
      if (u) usersMap[pid] = u;
    }
  }

  const partnerId = dm.isGroup
    ? null
    : dm.participantIds.find((p) => p !== me.id);
  const title = dm.isGroup
    ? (dm.groupName ?? "Group")
    : (usersMap[partnerId ?? ""]?.displayName ??
        usersMap[partnerId ?? ""]?.username ??
        "Direct Message");

  const mentionables = dm.participantIds
    .filter((id) => id !== me.id)
    .map((id) => usersMap[id])
    .filter(Boolean);

  return (
    <ChatView
      channelId={dm.id}
      kind="dm"
      title={title}
      icon="dm"
      composerPlaceholder={`Message @${title}`}
      users={usersMap}
      selfId={me.id}
      mentionables={mentionables}
      blockedUserIds={blockedUserIds}
      canPin
      initialNotificationLevel={notifLevels[dm.id] ?? "all"}
    />
  );
}
