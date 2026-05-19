import { notFound, redirect } from "next/navigation";
import { ChannelSidebar } from "@/components/ChannelSidebar";
import {
  getMe,
  getServerMembership,
  getServerWithChannels,
  listRoles,
} from "@/lib/server-api";
import { PERM } from "@/lib/types";

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;
  const me = await getMe();
  if (!me) redirect("/login");

  const [data, membership, roles] = await Promise.all([
    getServerWithChannels(serverId),
    getServerMembership(serverId),
    listRoles(serverId),
  ]);
  if (!data) notFound();

  const isOwner = data.isOwner;
  const myRoleIds = new Set(membership?.roleIds ?? []);
  let permissions = 0;
  for (const r of roles) {
    if (r.isEveryone || myRoleIds.has(r.id)) permissions |= r.permissions;
  }
  const has = (bit: number) => isOwner || (permissions & bit) !== 0;

  return (
    <div className="flex h-full min-w-0 flex-1">
      <ChannelSidebar
        server={data.server}
        categories={data.categories}
        channels={data.channels}
        me={me}
        isOwner={isOwner}
        canManageServer={has(PERM.MANAGE_SERVER)}
        canManageChannels={has(PERM.MANAGE_CHANNELS)}
        canKick={has(PERM.KICK_MEMBERS)}
        canBan={has(PERM.BAN_MEMBERS)}
      />
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
