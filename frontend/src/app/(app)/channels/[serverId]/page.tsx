import { redirect } from "next/navigation";
import { getMe, getServerWithChannels } from "@/lib/server-api";

export default async function ServerHome({
  params,
}: {
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;
  const me = await getMe();
  if (!me) redirect("/login");
  const data = await getServerWithChannels(serverId);
  if (!data) redirect("/channels/me");
  const firstText = data.channels.find((c) => c.kind === "text");
  if (firstText) redirect(`/channels/${serverId}/${firstText.id}`);
  return (
    <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
      No channels in this server yet.
    </div>
  );
}
