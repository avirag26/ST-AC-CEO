"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getStoredUser, type AuthUser } from "@/lib/auth-storage";

type RequireAuthProps = {
  children: (user: AuthUser) => ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      router.replace("/login");
      return;
    }

    if (stored.role !== "CEO" && stored.role !== "ADMIN") {
      router.replace("/login");
      return;
    }

    setUser(stored);
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-muted px-4">
        <p className="text-sm text-text-secondary">Checking your session…</p>
      </div>
    );
  }

  return <>{children(user)}</>;
}
