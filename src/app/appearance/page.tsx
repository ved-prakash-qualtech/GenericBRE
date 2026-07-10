"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Upload, RotateCcw, Sparkles, Bell, Search as SearchIcon, Workflow } from "lucide-react";
import { useAppStore, AppearanceSettings } from "@/lib/store";
import { THEME_PRESETS, getThemeDefinition } from "@/lib/theme-presets";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function AppearancePage() {
  const stored = useAppStore((s) => s.appearance);
  const setAppearance = useAppStore((s) => s.setAppearance);
  const resetAppearance = useAppStore((s) => s.resetAppearance);
  const [draft, setDraft] = useState<AppearanceSettings>(stored);
  const wallpaperInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const def = getThemeDefinition(draft.preset);
  const vars = draft.colorMode === "dark" ? def.dark : def.light;
  const previewStyle = {
    ...(vars as React.CSSProperties),
    colorScheme: draft.colorMode,
  } as React.CSSProperties;

  const dirty = JSON.stringify(draft) !== JSON.stringify(stored);

  const apply = () => {
    setAppearance(draft);
    toast.success("Appearance updated", { description: "Your preferences are now applied app-wide." });
  };
  const cancel = () => setDraft(stored);
  const resetToDefault = () => {
    resetAppearance();
    setDraft({
      preset: "client",
      colorMode: "light",
      wallpaper: null,
      wallpaperOpacity: 20,
      wallpaperBlur: 8,
      wallpaperBrightness: 100,
      logo: null,
      glassPanels: false,
    });
    toast.info("Reset to client default theme");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b bg-card/40 px-5 py-3.5 sm:px-6">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="size-4.5 text-primary" /> Appearance Studio
          </h1>
          <p className="text-xs text-muted-foreground">Personalize themes, colour mode, wallpaper & branding — preview before applying</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={resetToDefault}>
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <Button variant="outline" size="sm" disabled={!dirty} onClick={cancel}>
            Cancel
          </Button>
          <Button size="sm" disabled={!dirty} onClick={apply} className="gap-1.5">
            <Check className="size-3.5" /> Apply
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="w-full shrink-0 space-y-6 overflow-y-auto border-r p-5 sm:p-6 lg:w-100">
          <section>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Theme Preset</p>
            <div className="grid grid-cols-2 gap-2.5">
              {THEME_PRESETS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDraft((d) => ({ ...d, preset: t.id }))}
                  className={cn(
                    "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-all",
                    draft.preset === t.id ? "border-primary ring-2 ring-primary/20" : "hover:border-foreground/20"
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="size-5 rounded-full border shadow-sm" style={{ backgroundColor: t.swatch }} />
                    {draft.preset === t.id && <Check className="size-3.5 text-primary" />}
                  </div>
                  <p className="text-xs font-semibold">{t.name}</p>
                  <p className="text-[10.5px] leading-snug text-muted-foreground">{t.description}</p>
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colour Mode</p>
            <div className="flex overflow-hidden rounded-lg border">
              {(["light", "dark"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDraft((d) => ({ ...d, colorMode: mode }))}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium capitalize transition-colors",
                    draft.colorMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                  )}
                >
                  {mode} Mode
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Wallpaper</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => wallpaperInputRef.current?.click()}>
                <Upload className="size-3.5" /> Upload Image
              </Button>
              {draft.wallpaper && (
                <Button variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, wallpaper: null }))}>
                  Remove
                </Button>
              )}
              <input
                ref={wallpaperInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await readFileAsDataUrl(file);
                  setDraft((d) => ({ ...d, wallpaper: dataUrl }));
                }}
              />
            </div>
            {draft.wallpaper && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground"><span>Opacity</span><span>{draft.wallpaperOpacity}%</span></div>
                  <Slider value={[draft.wallpaperOpacity]} max={100} step={1} onValueChange={(v) => setDraft((d) => ({ ...d, wallpaperOpacity: sliderValue(v) }))} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground"><span>Blur</span><span>{draft.wallpaperBlur}px</span></div>
                  <Slider value={[draft.wallpaperBlur]} max={24} step={1} onValueChange={(v) => setDraft((d) => ({ ...d, wallpaperBlur: sliderValue(v) }))} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] text-muted-foreground"><span>Brightness</span><span>{draft.wallpaperBrightness}%</span></div>
                  <Slider value={[draft.wallpaperBrightness]} max={150} step={5} onValueChange={(v) => setDraft((d) => ({ ...d, wallpaperBrightness: sliderValue(v) }))} />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Label className="text-xs">Smart glass panels</Label>
                  <Switch checked={draft.glassPanels} onCheckedChange={(v) => setDraft((d) => ({ ...d, glassPanels: v }))} />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Logo</p>
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-lg border bg-muted/40">
                {draft.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.logo} alt="Logo preview" className="size-9 rounded object-contain" />
                ) : (
                  <Workflow className="size-5 text-muted-foreground" />
                )}
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => logoInputRef.current?.click()}>
                <Upload className="size-3.5" /> Replace Logo
              </Button>
              {draft.logo && (
                <Button variant="ghost" size="sm" onClick={() => setDraft((d) => ({ ...d, logo: null }))}>
                  Remove
                </Button>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await readFileAsDataUrl(file);
                  setDraft((d) => ({ ...d, logo: dataUrl }));
                }}
              />
            </div>
          </section>
        </div>

        <div className="flex-1 overflow-y-auto bg-muted/20 p-5 sm:p-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live Preview Sandbox</p>
          <div
            style={previewStyle}
            className={cn(
              "relative isolate overflow-hidden rounded-2xl border shadow-xl",
              draft.colorMode === "dark" ? "dark" : ""
            )}
          >
            {draft.wallpaper && (
              <div
                className="absolute inset-0 -z-10"
                style={{
                  backgroundImage: `url(${draft.wallpaper})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: `blur(${draft.wallpaperBlur}px) brightness(${draft.wallpaperBrightness}%)`,
                  opacity: draft.wallpaperOpacity / 100,
                }}
              />
            )}
            <div className="flex h-11 items-center gap-2 border-b px-4" style={{ background: "var(--sidebar)", color: "var(--sidebar-foreground)", borderColor: "var(--sidebar-border)" }}>
              <div className="flex size-6 items-center justify-center rounded-md" style={{ background: "var(--sidebar-primary)", color: "var(--sidebar-primary-foreground)" }}>
                {draft.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.logo} alt="" className="size-4 rounded object-contain" />
                ) : (
                  <Workflow className="size-3.5" />
                )}
              </div>
              <span className="text-xs font-semibold">Business Rules Engine</span>
              <div className="ml-auto flex items-center gap-2 opacity-70">
                <SearchIcon className="size-3.5" />
                <Bell className="size-3.5" />
              </div>
            </div>
            <div
              className={cn("flex gap-3 p-4", draft.glassPanels && draft.wallpaper && "backdrop-blur-md")}
              style={{ background: draft.wallpaper ? "transparent" : "var(--background)", color: "var(--foreground)" }}
            >
              <div className="hidden w-28 shrink-0 flex-col gap-1.5 rounded-lg p-2 sm:flex" style={{ background: "var(--sidebar)" }}>
                {["Dashboard", "Rule Builder", "Repository", "Matrix"].map((label, i) => (
                  <div
                    key={label}
                    className="rounded-md px-2 py-1.5 text-[10px] font-medium"
                    style={i === 0 ? { background: "color-mix(in oklch, var(--sidebar-primary) 15%, transparent)", color: "var(--sidebar-foreground)" } : { color: "color-mix(in oklch, var(--sidebar-foreground) 70%, transparent)" }}
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex-1 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {["Total Rules", "Active", "Draft"].map((label, i) => (
                    <div
                      key={label}
                      className={cn("rounded-lg border p-2.5", draft.glassPanels && draft.wallpaper && "backdrop-blur-md")}
                      style={{ background: draft.glassPanels && draft.wallpaper ? "color-mix(in oklch, var(--card) 70%, transparent)" : "var(--card)", borderColor: "var(--border)" }}
                    >
                      <p className="text-base font-bold" style={{ color: i === 0 ? "var(--primary)" : "var(--foreground)" }}>{[121, 66, 32][i]}</p>
                      <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between rounded-lg p-2.5 text-[11px] font-medium" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
                  Create Rule
                  <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">Primary Action</span>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {dirty ? "Preview reflects unsaved changes — click Apply to make them permanent." : "This matches your current live theme."}
          </p>
        </div>
      </div>
    </div>
  );
}
