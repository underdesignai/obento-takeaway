"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "@/lib/session";

function Gate({ children }: { children: React.ReactNode }) {
  const { role, loaded } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loaded && !role) router.push("/login");
  }, [loaded, role, router]);

  if (!loaded || !role) return null;

  return <>{children}</>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Gate>{children}</Gate>
    </SessionProvider>
  );
}
