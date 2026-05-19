import Link from "next/link";
import { X } from "lucide-react";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-semibold">User Settings</span>
        <Link
          href="/channels/me"
          aria-label="Close settings"
          className="flex h-7 w-7 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <X className="h-4 w-4" />
        </Link>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
