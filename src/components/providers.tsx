"use client";

import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "sonner";
import { useAppStore } from "@/lib/store";
import { getThemeDefinition } from "@/lib/theme-presets";

function applyAppearance(appearance: ReturnType<typeof useAppStore.getState>["appearance"]) {
  const root = document.documentElement;
  root.classList.toggle("dark", appearance.colorMode === "dark");
  root.classList.toggle("glass-mode", !!appearance.wallpaper && appearance.glassPanels);

  const def = getThemeDefinition(appearance.preset);
  const vars = appearance.colorMode === "dark" ? def.dark : def.light;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  if (appearance.wallpaper) {
    root.style.setProperty("--app-wallpaper", `url(${appearance.wallpaper})`);
    root.style.setProperty("--app-wallpaper-opacity", String(appearance.wallpaperOpacity / 100));
    root.style.setProperty("--app-wallpaper-blur", `${appearance.wallpaperBlur}px`);
    root.style.setProperty("--app-wallpaper-brightness", `${appearance.wallpaperBrightness}%`);
  } else {
    root.style.removeProperty("--app-wallpaper");
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const appearance = useAppStore((s) => s.appearance);

  useEffect(() => {
    Promise.resolve(useAppStore.persist.rehydrate()).then(() => setHydrated(true));
  }, []);

  useEffect(() => {
    applyAppearance(appearance);
  }, [appearance]);

  return (
    <TooltipProvider delay={200}>
      <div style={{ visibility: hydrated ? "visible" : "hidden" }}>{children}</div>
      <Toaster position="top-right" richColors closeButton expand={false} />
    </TooltipProvider>
  );
}
