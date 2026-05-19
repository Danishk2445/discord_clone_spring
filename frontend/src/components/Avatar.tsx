import { cn } from "@/lib/cn";
import { API_BASE } from "@/lib/api-base";
import type { Presence } from "@/lib/types";

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("/uploads/")) return `${API_BASE}${url}`;
  return url;
}

type Size = "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE: Record<Size, string> = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-10 w-10 text-sm",
  xl: "h-20 w-20 text-2xl",
  "2xl": "h-32 w-32 text-4xl",
};

const DOT_SIZE: Record<Size, string> = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-5 w-5",
  "2xl": "h-7 w-7",
};

const STATUS_COLOR: Record<Presence, string> = {
  online: "bg-online",
  idle: "bg-idle",
  dnd: "bg-dnd",
  offline: "bg-text-dim",
};

export function Avatar({
  name,
  color,
  status,
  size = "md",
  imageUrl,
  className,
}: {
  name: string;
  color: string;
  status?: Presence;
  size?: Size;
  imageUrl?: string | null;
  className?: string;
}) {
  const initial = name.slice(0, 1).toUpperCase();
  const resolved = resolveImageUrl(imageUrl);
  return (
    <div className={cn("relative shrink-0 rounded-full", SIZE[size], className)}>
      <div
        className={cn(
          "flex h-full w-full items-center justify-center overflow-hidden rounded-full font-semibold text-bg",
        )}
        style={{ background: resolved ? "transparent" : color }}
      >
        {resolved ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolved} alt={name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </div>
      {status ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-bg",
            DOT_SIZE[size],
            STATUS_COLOR[status],
          )}
        />
      ) : null}
    </div>
  );
}
