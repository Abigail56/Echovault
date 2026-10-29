import type { LucideIcon } from "lucide-react";
import Link from "next/link";

export interface MapItem {
  id: string;
  title: string;
  href?: string;
  meta?: string;
}

export interface MapGroup {
  label: string;
  icon: LucideIcon;
  items: MapItem[];
  empty?: string;
}

interface ConnectionMapProps {
  center: { kind: string; title: string; icon: LucideIcon };
  groups: MapGroup[];
  caption?: string;
}

/**
 * Shows how one record connects to others: a central node with labelled
 * branches. Lines are drawn with borders (no canvas or graph library), and the
 * layout becomes a vertical list on narrow screens.
 */
export function ConnectionMap({ center, groups, caption }: ConnectionMapProps) {
  const cols = groups.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <figure className="surface p-5 sm:p-6" aria-label={caption ?? `Connections of ${center.title}`}>
      <div className="flex justify-center">
        <div className="border-primary/50 bg-primary/10 flex max-w-full items-center gap-2.5 rounded-box border px-4 py-2.5">
          <center.icon className="text-primary size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="text-meta block leading-tight">{center.kind}</span>
            <span className="block truncate text-sm font-semibold">{center.title}</span>
          </span>
        </div>
      </div>
      {/* Trunk line from the centre node down to the branches. */}
      <div className="bg-base-300 mx-auto hidden h-5 w-px md:block" aria-hidden />
      <div
        className={`relative mt-4 grid gap-5 md:mt-0 md:gap-4 ${cols} md:before:bg-base-300 md:before:absolute md:before:top-0 md:before:h-px ${
          groups.length === 2 ? "md:before:right-1/4 md:before:left-1/4" : "md:before:right-[16.66%] md:before:left-[16.66%]"
        }`}
      >
        {groups.map((group) => (
          <div
            key={group.label}
            className="border-base-300 relative min-w-0 border-l pl-4 md:border-l-0 md:pt-5 md:pl-0 md:before:bg-base-300 md:before:absolute md:before:top-0 md:before:left-1/2 md:before:h-5 md:before:w-px"
          >
            <p className="text-meta mb-2 flex items-center gap-1.5 font-medium md:justify-center">
              <group.icon className="size-3.5" aria-hidden />
              {group.label}
            </p>
            {group.items.length ? (
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const body = (
                    <>
                      <span className="bg-secondary size-1.5 shrink-0 rounded-full" aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{item.title}</span>
                        {item.meta && <span className="text-meta block truncate">{item.meta}</span>}
                      </span>
                    </>
                  );
                  const cls = "border-base-300 bg-base-200/50 flex items-center gap-2 rounded-field border px-3 py-2";
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} className={`${cls} hover:border-primary/50 transition-colors`}>
                          {body}
                        </Link>
                      ) : (
                        <div className={cls}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-meta border-base-300 rounded-field border border-dashed px-3 py-2 md:text-center">{group.empty ?? "None yet"}</p>
            )}
          </div>
        ))}
      </div>
      {caption && <figcaption className="text-meta mt-4 text-center">{caption}</figcaption>}
    </figure>
  );
}
