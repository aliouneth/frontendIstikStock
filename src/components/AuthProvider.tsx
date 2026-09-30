"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "@/lib/api";
import { readToken, writeToken } from "@/lib/session";
import type { AccessResponse, AuthUser, FeatureKey, Subscription } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  plans: Subscription[];
  features: FeatureKey[];
  featureLabels: Record<string, string>;
  ready: boolean;
  offline: boolean;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string
  ) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  can: (feature: FeatureKey) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plans, setPlans] = useState<Subscription[]>([]);
  const [features, setFeatures] = useState<FeatureKey[]>([]);
  const [featureLabels, setFeatureLabels] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [offline, setOffline] = useState(false);

  const apply = useCallback((payload: AccessResponse) => {
    setUser(payload.user);
    setFeatures(payload.features ?? []);
    setPlans(payload.plans ?? []);
    setFeatureLabels(payload.available_features ?? {});
    setOffline(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await api.fetchAccess());
    } catch {
      if (readToken()) {
        try {
          apply(await api.fetchMe());
        } catch {
          writeToken(null);
          setUser(null);
          try {
            apply(await api.fetchAccess());
          } catch {
            setOffline(true);
          }
        }
      } else {
        setOffline(true);
      }
    } finally {
      setReady(true);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      writeToken(res.token);
      apply(res);
      return res.user;
    },
    [apply]
  );

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      passwordConfirmation: string
    ) => {
      const res = await api.register(name, email, password, passwordConfirmation);
      writeToken(res.token);
      apply(res);
      return res.user;
    },
    [apply]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      /* token already invalid — clear locally regardless */
    }
    writeToken(null);
    setUser(null);
    await refresh();
  }, [refresh]);

  const can = useCallback(
    (feature: FeatureKey) => features.includes(feature),
    [features]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      plans,
      features,
      featureLabels,
      ready,
      offline,
      login,
      register,
      logout,
      refresh,
      can,
      isAdmin: user?.is_admin ?? false,
    }),
    [user, plans, features, featureLabels, ready, offline, login, register, logout, refresh, can]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
