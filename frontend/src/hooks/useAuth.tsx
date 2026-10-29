import { useRouter } from "next/router";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { ApiError, setSessionExpiredHandler } from "@/lib/api/client";
import { authApi } from "@/lib/api/services";
import type { User } from "@/lib/api/types";

type Status = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  user: User | null;
  status: Status;
  login: (email: string, password: string) => Promise<void>;
  /** acceptedTermsVersion: the version of the Terms the user ticked to accept. */
  register: (fullName: string, email: string, password: string, acceptedTermsVersion: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  /** Clear local state after the server has already ended the session. */
  forgetSession: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const forgetSession = useCallback(() => {
    setUserState(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    // The session lives in HttpOnly cookies; asking /auth/me is the only way to know.
    authApi
      .me()
      .then((me) => {
        setUserState(me);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          console.error("Could not load the current user", error);
        }
        setStatus("anonymous");
      });
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(forgetSession);
    return () => setSessionExpiredHandler(null);
  }, [forgetSession]);

  const login = useCallback(async (email: string, password: string) => {
    const me = await authApi.login({ email, password });
    setUserState(me);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string, acceptedTermsVersion: string) => {
    const me = await authApi.register({
      full_name: fullName,
      email,
      password,
      accept_terms: true,
      terms_version: acceptedTermsVersion,
    });
    setUserState(me);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      forgetSession();
      await router.push("/login");
    }
  }, [forgetSession, router]);

  const setUser = useCallback((next: User) => setUserState(next), []);

  const value = useMemo(
    () => ({ user, status, login, register, logout, setUser, forgetSession }),
    [user, status, login, register, logout, setUser, forgetSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
