"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTracking } from "@/components/TrackingProvider";

interface User {
  id: string;
  email: string | null; // null for phone-only "guest" accounts
  firstName: string | null;
  lastName: string | null;
  phone?: string | null;
  role: string;
  // Per-user cost-plus markup (cents above supplier cost). When set, the
  // cart applies an auto-coupon line equal to (retail subtotal − cost-plus
  // subtotal). Server is authoritative at order-mint so client tampering
  // does nothing. NULL/undefined means retail pricing.
  costPlusMarginCents?: number | null;
  // Saved researcher self-classification + acknowledgment timestamp. When
  // present, checkout pre-fills the attestation so the customer doesn't
  // re-declare on every order.
  researcherType?: string | null;
  researchUseAcknowledgedAt?: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  // `user` is returned on success so callers can route by role
  // (admins → /admin, customers → /account) without a second fetch.
  signIn: (email: string, password: string) => Promise<{ error?: string; user?: User }>;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { track } = useTracking();

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = async (email: string, password: string) => {
    const res = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data.error };

    setUser(data.user);
    // Return the user so the caller can branch on role (admins are
    // routed to /admin, everyone else to /account by default).
    return { user: data.user };
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    // Check for stored referral code
    let referralCode: string | undefined;
    try {
      referralCode = localStorage.getItem("br-ref") || undefined;
    } catch { /* SSR safety */ }

    const res = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName, referralCode }),
    });

    const data = await res.json();
    if (!res.ok) return { error: data.error };

    // Clear referral code after successful signup
    try { localStorage.removeItem("br-ref"); } catch { /* SSR safety */ }

    await refreshUser();
    track({ event: "Lead", email });
    return {};
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
