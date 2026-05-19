import { redirect } from "next/navigation";
import { API_BASE } from "@/lib/api-base";
import { getInvitePreview, getMe } from "@/lib/server-api";
import { AcceptInviteForm } from "./AcceptInviteForm";

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const me = await getMe();
  if (!me) redirect(`/login?next=/invite/${code}`);
  const preview = await getInvitePreview(code);

  return (
    <div className="flex h-full min-h-screen w-full items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 text-center shadow-2xl">
        {!preview ? (
          <>
            <h1 className="text-base font-semibold">Invite invalid</h1>
            <p className="mt-1 text-xs text-text-muted">
              The link may have expired or been revoked.
            </p>
            <a
              href="/channels/me"
              className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg hover:bg-accent-strong"
            >
              Back to Mihord
            </a>
          </>
        ) : (
          <>
            {(() => {
              const icon = resolveImageUrl(preview.server.iconUrl);
              return icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={icon}
                  alt={preview.server.name}
                  className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-bold text-bg"
                  style={{ background: preview.server.accent }}
                >
                  {preview.server.short}
                </div>
              );
            })()}
            <p className="text-xs uppercase tracking-wider text-text-muted">
              You&apos;ve been invited to join
            </p>
            <h1 className="mt-1 text-lg font-semibold">{preview.server.name}</h1>
            <AcceptInviteForm
              code={preview.code}
              alreadyMember={preview.alreadyMember}
              serverId={preview.server.id}
            />
          </>
        )}
      </div>
    </div>
  );
}
