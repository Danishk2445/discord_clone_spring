import { redirect } from "next/navigation";
import { ProfileEditor } from "@/components/ProfileEditor";
import { getMe } from "@/lib/server-api";

export default async function SettingsHome() {
  const me = await getMe();
  if (!me) redirect("/login");
  return <ProfileEditor user={me} />;
}
