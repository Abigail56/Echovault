import { Compass } from "lucide-react";
import Head from "next/head";
import Link from "next/link";

import { Logo } from "@/components/ui/Logo";

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found · EchoVault Nexus</title>
      </Head>
      <div className="flex min-h-dvh flex-col">
        <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6">
          <Logo />
        </div>
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-20 text-center">
          <Compass className="text-primary mb-4 size-10" aria-hidden />
          <h1 className="text-page-title">Page not found</h1>
          <p className="text-muted mt-2 max-w-sm text-sm">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
          <div className="mt-6 flex gap-2">
            <Link href="/dashboard" className="btn btn-primary btn-sm">
              Go to dashboard
            </Link>
            <Link href="/" className="btn btn-ghost btn-sm">
              Home
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}
