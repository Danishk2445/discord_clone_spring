"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, LogOut } from "lucide-react";
import { logout, updateProfile, uploadFile } from "@/lib/client-api";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/cn";
import type { SelfUser } from "@/lib/types";

export function ProfileEditor({ user }: { user: SelfUser }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatarUrl);
  const initial = useRef({
    displayName: user.displayName,
    bio: user.bio ?? "",
    avatarUrl: user.avatarUrl,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty =
    displayName !== initial.current.displayName ||
    bio !== initial.current.bio ||
    avatarUrl !== initial.current.avatarUrl;

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That doesn't look like an image.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setError(null);
    const uploaded = await uploadFile(file);
    setUploading(false);
    e.target.value = "";
    if (!uploaded) {
      setError("Upload failed. Try a smaller image (under 10 MB).");
      return;
    }
    setAvatarUrl(uploaded.url);
    setSaved(false);
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    const updated = await updateProfile({
      displayName: displayName.trim(),
      bio,
      avatarUrl,
    });
    setSaving(false);
    if (!updated) {
      setError("Could not save changes.");
      return;
    }
    initial.current = {
      displayName: updated.displayName,
      bio: updated.bio ?? "",
      avatarUrl: updated.avatarUrl,
    };
    setDisplayName(updated.displayName);
    setBio(updated.bio ?? "");
    setAvatarUrl(updated.avatarUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  const onLogOut = async () => {
    await logout();
    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="text-lg font-semibold">My Profile</h1>
      <p className="mt-1 text-sm text-text-muted">
        This is how others see you on Mihord.
      </p>

      <div className="mt-8 flex items-center gap-6">
        <div className="relative">
          <Avatar
            name={displayName || user.username}
            color={user.avatarColor}
            imageUrl={avatarUrl}
            size="2xl"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile picture"
            disabled={uploading}
            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-bg ring-4 ring-bg transition-colors hover:bg-accent-strong disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => void onPickFile(e)}
            className="hidden"
          />
        </div>
        <div className="text-sm">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md border border-border bg-surface px-3 py-1.5 font-medium transition-colors hover:bg-surface-hover hover:text-accent disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload picture"}
          </button>
          {avatarUrl ? (
            <button
              type="button"
              onClick={() => {
                setAvatarUrl(null);
                setSaved(false);
              }}
              className="ml-2 rounded-md px-3 py-1.5 text-text-muted transition-colors hover:text-danger"
            >
              Remove
            </button>
          ) : null}
          <p className="mt-2 text-xs text-text-muted">
            JPEG, PNG, GIF, or WebP. Up to 10 MB.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        <Field label="Display name">
          <input
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setSaved(false);
            }}
            maxLength={32}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors focus:border-accent/60"
          />
        </Field>

        <Field label="Bio" hint={`${bio.length}/190`}>
          <textarea
            value={bio}
            onChange={(e) => {
              setBio(e.target.value);
              setSaved(false);
            }}
            rows={4}
            maxLength={190}
            placeholder="Tell people a bit about yourself"
            className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent/60"
          />
        </Field>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <button
          type="button"
          onClick={onLogOut}
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
        <div className="flex items-center gap-3">
          {saved ? (
            <span className="text-xs text-accent">Saved.</span>
          ) : null}
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className={cn(
              "rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg transition-colors",
              "hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-accent",
            )}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {hint ? (
          <span className="text-[11px] text-text-dim">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  );
}
