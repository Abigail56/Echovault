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
        <div className="border-primary bg-primary/15 animate-pop flex max-w-full items-center gap-2.5 rounded-box border px-4 py-2.5 shadow-lg shadow-black/20">
          <center.icon className="text-primary size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            <span className="text-meta block leading-tight">{center.kind}</span>
            <span className="block truncate text-sm font-semibold">{center.title}</span>
          </span>
        </div>
      </div>
      {/* Trunk line from the centre node down to the branches. */}
      <div className="bg-primary/60 grow-y mx-auto hidden h-5 w-px [--delay:0.2s] md:block" aria-hidden />
      <div
        className={`relative mt-4 grid gap-5 md:mt-0 md:gap-4 ${cols} md:before:bg-primary/60 md:before:absolute md:before:top-0 md:before:h-px md:before:origin-center md:before:animate-[ev-grow-x_0.5s_ease-out_0.45s_both] ${
          groups.length === 2 ? "md:before:right-1/4 md:before:left-1/4" : "md:before:right-[16.66%] md:before:left-[16.66%]"
        }`}
      >
        {groups.map((group, index) => (
          <div
            key={group.label}
            style={{ animationDelay: `${0.85 + index * 0.12}s` }}
            className="border-primary/40 animate-page-in relative min-w-0 border-l pl-4 md:border-l-0 md:pt-5 md:pl-0 md:before:bg-primary/60 md:before:absolute md:before:top-0 md:before:left-1/2 md:before:h-5 md:before:w-px md:before:origin-top md:before:animate-[ev-grow-y_0.3s_ease-out_0.8s_both]"
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
