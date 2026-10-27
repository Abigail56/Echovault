import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders user-written Markdown safely: react-markdown never injects raw HTML
 * (we additionally set skipHtml), and links open safely in a new tab.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-ev">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a: ({ href, children: linkChildren }) => (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow">
              {linkChildren}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
