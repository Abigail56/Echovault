import { useRouter } from "next/router";
import { useEffect } from "react";

const MESSAGE = "You have unsaved changes. Leave this page and lose them?";

/** Warns before leaving the page (tab close or in-app navigation) while `dirty`. */
export function useUnsavedChanges(dirty: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onRouteChangeStart = (url: string) => {
      if (url !== router.asPath && !window.confirm(MESSAGE)) {
        router.events.emit("routeChangeError");
        // Aborting a Next.js route change is done by throwing.
        throw "Navigation cancelled because of unsaved changes";
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    router.events.on("routeChangeStart", onRouteChangeStart);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      router.events.off("routeChangeStart", onRouteChangeStart);
    };
  }, [dirty, router]);
}
