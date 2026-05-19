"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/lib/client-api";

export function AcceptInviteForm({
  code,
  alreadyMember,
  serverId,
}: {
  code: string;
  alreadyMember: boolean;
  serverId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const onAccept = async () => {
    setBusy(true);
    const result = await acceptInvite(code);
    setBusy(false);
    if (result) {
      router.replace(`/channels/${result.server.id}`);
      router.refresh();
    }
  };

  if (alreadyMember) {
    return (
      <>
        <p className="mt-2 text-xs text-text-muted">
          You&apos;re already a member.
        </p>
        <a
          href={`/channels/${serverId}`}
          className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-strong"
        >
          Open server
        </a>
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={onAccept}
      disabled={busy}
      className="mt-6 w-full rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-strong disabled:opacity-40"
    >
      {busy ? "Joining…" : "Accept Invite"}
    </button>
  );
}
