import {
  AARTI_LIBRARY_LABEL_SHORT,
  AARTI_LIBRARY_PATH,
  AARTI_LIBRARY_TITLE,
} from "@/lib/labels";

/** Plain <a>: /parmanand/ is served by nginx, not by this app, so no client routing. */
export function AartiLink({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <a
      href={AARTI_LIBRARY_PATH}
      title={AARTI_LIBRARY_TITLE}
      aria-label={AARTI_LIBRARY_TITLE}
      className={className}
    >
      {compact ? AARTI_LIBRARY_LABEL_SHORT : AARTI_LIBRARY_TITLE}
    </a>
  );
}
