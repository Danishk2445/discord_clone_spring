import { redirect } from "next/navigation";
import { DMSidebar } from "@/components/DMSidebar";
import { getMe, listDMs, listFriends } from "@/lib/server-api";

export default async function DmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();
  if (!me) redirect("/login");
  const [dms, friends] = await Promise.all([
    listDMs(),
    listFriends("all"),
  ]);

  const participants = Object.fromEntries(
    friends.map((f) => [f.user.id, f.user]),
  );
  participants[me.id] = me;

  return (
    <div className="flex h-full min-w-0 flex-1">
      <DMSidebar me={me} dms={dms} participants={participants} />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
