import { Head, Html, Main, NextScript } from "next/document";

import { themeBootScript } from "@/hooks/useTheme";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta
          name="description"
          content="EchoVault Nexus: capture ideas, organise projects, record decisions and rediscover what you know."
        />
        <link rel="icon" href="/favicon.ico" />
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
