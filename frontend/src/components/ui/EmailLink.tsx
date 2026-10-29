import { isPlaceholder } from "@/lib/legal";

/**
 * A clickable mailto: link for a configured address. An unconfigured
 * [placeholder] is shown as plain, clearly marked text instead of a link
 * that would go nowhere.
 */
export function EmailLink({ address, subject }: { address: string; subject?: string }) {
  if (isPlaceholder(address)) {
    return (
      <span className="text-warning" title="Not configured yet: set it in frontend/.env.local">
        {address}
      </span>
    );
  }
  const href = `mailto:${address}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
  return (
    <a href={href} className="link link-primary break-all">
      {address}
    </a>
  );
}
