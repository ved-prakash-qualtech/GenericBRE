"use client";

import { useRouter } from "next/navigation";
import { AppearanceStudio } from "@/components/studio/appearance-studio";

export default function AppearancePage() {
  const router = useRouter();
  return (
    <AppearanceStudio
      open
      onOpenChange={(v) => {
        if (!v) router.push("/dashboard");
      }}
    />
  );
}
