import { BookOpen, FileText, FolderKanban, type LucideIcon, Scale } from "lucide-react";
import type { CSSProperties } from "react";

interface GraphNode {
  x: number; // centre
  y: number;
  kind: string;
  title: string;
  icon: LucideIcon;
  delay: number;
  primary?: boolean;
  width?: number;
}

const W = 212;
const H = 56;

const CENTER: GraphNode = { x: 300, y: 190, kind: "Note", title: "Token bucket rate limiting", icon: BookOpen, delay: 0.15, primary: true, width: 244 };
const BRANCHES: (GraphNode & { edge: string })[] = [
  { x: 126, y: 62, kind: "Project", title: "Public API launch", icon: FolderKanban, delay: 1.0, edge: "M 300 162 C 300 124, 126 128, 126 90" },
  { x: 474, y: 62, kind: "Decision", title: "Rate-limit per API key", icon: Scale, delay: 1.2, edge: "M 300 162 C 300 124, 474 128, 474 90" },
  { x: 126, y: 318, kind: "Reference", title: "Nginx limit_req config", icon: FileText, delay: 1.4, edge: "M 300 218 C 300 256, 126 252, 126 290" },
  { x: 474, y: 318, kind: "Reference", title: "RFC 6585: HTTP 429", icon: FileText, delay: 1.6, edge: "M 300 218 C 300 256, 474 252, 474 290" },
];

const delay = (seconds: number) => ({ "--delay": `${seconds}s` }) as CSSProperties;

function Node({ node }: { node: GraphNode }) {
  const width = node.width ?? W;
  const left = node.x - width / 2;
  const top = node.y - H / 2;
  return (
    <g className="pop-in graph-node" style={delay(node.delay)}>
      <rect
        x={left}
        y={top}
        width={width}
        height={H}
        rx={12}
        className={node.primary ? "fill-primary/15 stroke-primary" : "fill-base-100 stroke-base-300"}
        strokeWidth={node.primary ? 1.5 : 1}
      />
      <node.icon x={left + 14} y={node.y - 9} width={18} height={18} className={node.primary ? "text-primary" : "text-muted"} aria-hidden />
      <text x={left + 42} y={node.y - 4} className="fill-subtle text-[10px] font-semibold tracking-[0.1em] uppercase">
        {node.kind}
      </text>
      <text x={left + 42} y={node.y + 12} className="fill-base-content text-[12.5px] font-semibold">
        {node.title}
      </text>
    </g>
  );
}

/** Phones: the same connections as a readable vertical chain. */
function ChainView() {
  const chain = [CENTER, ...BRANCHES];
  return (
    <ol className="mx-auto max-w-xs sm:hidden" aria-label="Illustration: a note linked to its project, a decision and two references">
      {chain.map((node, i) => (
        <li key={node.title} className="flex flex-col items-center">
          {i > 0 && <span className="bg-primary/70 grow-y h-5 w-px" style={delay(0.2 + i * 0.25)} aria-hidden />}
          <div
            className={`animate-pop flex w-full items-center gap-3 rounded-box border px-4 py-2.5 ${node.primary ? "border-primary bg-primary/15" : "border-base-300 bg-base-100"}`}
            style={{ animationDelay: `${0.1 + i * 0.25}s` }}
          >
            <node.icon className={`size-4 shrink-0 ${node.primary ? "text-primary" : "text-muted"}`} aria-hidden />
            <span className="min-w-0">
              <span className="text-subtle block text-[10px] font-semibold tracking-[0.1em] uppercase">{node.kind}</span>
              <span className="block truncate text-sm font-semibold">{node.title}</span>
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The landing-page hero visual: a note's connections draw themselves in, once.
 * Sample data, labelled as such; reduced-motion users see the finished graph.
 */
export function HeroGraph() {
  return (
    <figure className="relative">
      <ChainView />
      <svg
        viewBox="0 0 600 380"
        className="hidden h-auto w-full sm:block"
        role="img"
        aria-label="Illustration: a note linked to its project, a decision and two references"
      >
        {/* Faint dotted grid for depth. */}
        <defs>
          <pattern id="hero-dots" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" className="fill-base-300" />
          </pattern>
        </defs>
        <rect width="600" height="380" rx="20" fill="url(#hero-dots)" opacity="0.6" />
        {BRANCHES.map((b) => (
          <path
            key={b.title}
            d={b.edge}
            fill="none"
            className="draw-line stroke-primary"
            strokeWidth={1.5}
            strokeLinecap="round"
            style={{ "--len": 300, ...delay(b.delay - 0.55) } as CSSProperties}
          />
        ))}
        <Node node={CENTER} />
        {BRANCHES.map((b) => (
          <Node key={b.title} node={b} />
        ))}
      </svg>
      <figcaption className="text-meta mt-2 text-center">Illustration with sample data</figcaption>
    </figure>
  );
}
