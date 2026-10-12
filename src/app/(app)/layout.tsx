"use client";

import type { ReactNode } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      {(user) => <AppShell user={user}>{children}</AppShell>}
    </RequireAuth>
  );
}
