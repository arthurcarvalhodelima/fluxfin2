"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import SplashScreen from "@/components/SplashScreen";

export default function HomePage() {
  const { status } = useSession();
  const router = useRouter();
  const [splashDone, setSplashDone] = useState(false);

  const handleSplashComplete = useCallback(() => {
    setSplashDone(true);
  }, []);

  useEffect(() => {
    if (!splashDone) return;

    if (status === "authenticated") {
      router.push("/dashboard");
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, splashDone, router]);

  return <SplashScreen onComplete={handleSplashComplete} />;
}
