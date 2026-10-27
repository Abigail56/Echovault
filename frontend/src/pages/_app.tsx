import "@/styles/globals.css";

import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";
import Head from "next/head";

import { AuthProvider } from "@/hooks/useAuth";
import { ToastProvider } from "@/hooks/useToast";
import type { PageWithLayout } from "@/lib/layout";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

type Props = AppProps & { Component: PageWithLayout };

export default function App({ Component, pageProps }: Props) {
  const getLayout = Component.getLayout ?? ((page) => page);
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>EchoVault Nexus</title>
      </Head>
      <div className={`${geistSans.variable} ${geistMono.variable} font-sans`}>
        <AuthProvider>
          <ToastProvider>{getLayout(<Component {...pageProps} />)}</ToastProvider>
        </AuthProvider>
      </div>
    </>
  );
}
