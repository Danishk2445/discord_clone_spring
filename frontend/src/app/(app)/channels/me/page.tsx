import { redirect } from "next/navigation";
import { FriendsList } from "@/components/FriendsList";
import { getMe, listFriends } from "@/lib/server-api";

export default async function FriendsHome() {
  const me = await getMe();
  if (!me) redirect("/login");
  const friends = await listFriends("all");
  return <FriendsList initialFriends={friends} selfId={me.id} />;
}
