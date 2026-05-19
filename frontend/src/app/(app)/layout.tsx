import { redirect } from "next/navigation";
import { ServerRail } from "@/components/ServerRail";
import { IncomingCallNotifier } from "@/components/IncomingCallNotifier";
import { getMe, listServers } from "@/lib/server-api";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getMe();
  if (!me) redirect("/login");
  const servers = await listServers();
  return (
    <div className="flex h-full w-full bg-bg">
      <ServerRail servers={servers} selfId={me.id} />
      <div className="flex min-w-0 flex-1">{children}</div>
      <IncomingCallNotifier />
    </div>
  );
}
