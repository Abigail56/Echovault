import { Head, Html, Main, NextScript } from "next/document";

import { themeBootScript } from "@/hooks/useTheme";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="description"
          content="EchoVault Nexus: capture what you learn, organise your projects and preserve the reasoning behind your decisions."
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#0B0C12" />
        {/* Static, trusted script: applies the saved theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
