"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
  ArrowLeft,
  Check,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingDown,
  TrendingUp,
  Upload,
  Workflow,
  X,
} from "lucide-react";
import { useAppStore, useHasCapability, DEFAULT_APPEARANCE } from "@/lib/store";
import { applyAppearance } from "@/components/providers";
import { THEME_PRESETS } from "@/lib/theme-presets";
import type {
  AppearanceSettings,
  BackgroundDisplayMode,
  BackgroundTarget,
  ColorMode,
  CustomColors,
  DensityMode,
  FontScale,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
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

const COLOR_MODES: { id: ColorMode; label: string; icon: typeof Sun }[] = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

const CUSTOM_COLOR_ROWS: { key: keyof CustomColors; label: string }[] = [
  { key: "primary", label: "Primary / Buttons" },
  { key: "sidebarBg", label: "Sidebar Background" },
  { key: "sidebarFg", label: "Sidebar Text" },
  { key: "sidebarActive", label: "Sidebar Active" },
  { key: "chartAccent", label: "Chart Accent" },
];

const BG_TARGETS: BackgroundTarget[] = ["app", "dashboard", "sidebar"];
const BG_DISPLAY_MODES: BackgroundDisplayMode[] = ["cover", "contain", "fixed", "blur"];
const DENSITY_MODES: DensityMode[] = ["compact", "comfortable", "spacious"];
const FONT_SCALES: FontScale[] = ["sm", "md", "lg"];

function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  render,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
  render?: (opt: T) => React.ReactNode;
}) {
  return (
    <div className="flex overflow-hidden rounded-lg border text-xs">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 py-2 font-medium capitalize transition-colors",
            value === opt ? "bg-primary text-primary-foreground" : "hover:bg-accent"
          )}
        >
          {render ? render(opt) : opt}
        </button>
      ))}
    </div>
  );
}

function SliderRow({
  label,
  unit,
  value,
  max,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span>
          {value}
          {unit}
        </span>
      </div>
      <Slider value={[value]} max={max} step={1} onValueChange={(v) => onChange(sliderValue(v))} />
    </div>
  );
}

function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div>
        <p className="text-xs font-medium">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

interface AppearanceStudioProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppearanceStudio({ open, onOpenChange }: AppearanceStudioProps) {
  const stored = useAppStore((s) => s.appearance);
  const setAppearance = useAppStore((s) => s.setAppearance);
  const roles = useAppStore((s) => s.roles);
  const currentUser = useAppStore((s) => s.currentUser);
  const canManageBranding = useHasCapability("config.manage");
  const [draft, setDraft] = useState<AppearanceSettings>(stored);
  const [wasOpen, setWasOpen] = useState(open);
  const [activeTab, setActiveTab] = useState("theme");
  const bgInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const role = roles.find((r) => r.id === currentUser.role);

  // Re-seed the sandboxed draft from committed prefs every time the studio
  // opens — adjusting state during render (React's documented pattern for
  // "reset state when a prop changes") rather than in an effect.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setDraft(stored);
  }

  // Safety net: snap back to a public tab if a non-admin ends up on the
  // Branding tab (role switched mid-session, or stale state).
  if (activeTab === "branding" && !canManageBranding) {
    setActiveTab("theme");
  }

  // Apply the draft straight to the DOM while the studio is open — the whole
  // app (including the mockup below, which reads the same CSS variables)
  // re-themes live, matching the sandboxed-draft architecture.
  useEffect(() => {
    if (!open) return;
    applyAppearance(draft);
  }, [draft, open]);

  const patch = (p: Partial<AppearanceSettings>) => setDraft((d) => ({ ...d, ...p }));

  const cancel = () => {
    applyAppearance(stored);
    onOpenChange(false);
  };
  const commit = () => {
    setAppearance(draft);
    toast.success("Appearance updated", { description: "Applied across the workspace." });
    onOpenChange(false);
  };
  const reset = () => setDraft(DEFAULT_APPEARANCE);
  const useRoleDefault = () => {
    if (!role) return;
    setDraft({ ...DEFAULT_APPEARANCE, ...role.defaultAppearance });
    toast.info(`Applied ${role.name}'s organization default`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) cancel();
      }}
    >
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="appearance-studio"
          className="fixed inset-2 z-50 flex flex-col overflow-hidden rounded-2xl bg-popover text-popover-foreground shadow-2xl ring-1 ring-foreground/10 outline-none duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 sm:inset-4 md:inset-6 lg:inset-10"
        >
          {/* Header */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b bg-card/60 px-4 py-3">
            <Button variant="ghost" size="icon-sm" onClick={cancel} aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </span>
            <p className="text-sm font-semibold tracking-tight">Appearance Studio</p>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Live Preview
            </span>

            <div className="ml-auto flex items-center gap-2">
              {role && (
                <Button variant="outline" size="sm" onClick={useRoleDefault} className="hidden md:inline-flex">
                  Use {role.name} Default
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="size-3.5" /> Reset
              </Button>
              <Button variant="outline" size="sm" onClick={cancel}>
                Cancel
              </Button>
              <Button size="sm" onClick={commit} className="gap-1.5">
                <Check className="size-3.5" /> Apply Changes
              </Button>
              <DialogPrimitive.Close
                render={<Button variant="ghost" size="icon-sm" />}
                aria-label="Close"
              >
                <X className="size-4" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as string)} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="mx-4 mt-3 w-fit shrink-0">
              <TabsTrigger value="theme">Theme</TabsTrigger>
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="bg">BG</TabsTrigger>
              <TabsTrigger value="display">Display</TabsTrigger>
              {canManageBranding && <TabsTrigger value="branding">Branding</TabsTrigger>}
            </TabsList>

            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
              <div className="w-full shrink-0 overflow-y-auto border-r p-4 lg:w-96">
                <TabsContent value="theme" className="space-y-5">
                  <section>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Color Mode
                    </p>
                    <SegmentedControl
                      value={draft.colorMode}
                      options={COLOR_MODES.map((m) => m.id)}
                      onChange={(v) => patch({ colorMode: v })}
                      render={(v) => {
                        const m = COLOR_MODES.find((x) => x.id === v)!;
                        return (
                          <>
                            <m.icon className="size-3.5" /> {m.label}
                          </>
                        );
                      }}
                    />
                  </section>

                  <section>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Themes</p>
                      <span className="text-[11px] text-muted-foreground">{THEME_PRESETS.length} themes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {THEME_PRESETS.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => patch({ preset: t.id })}
                          className={cn(
                            "flex flex-col items-start gap-1.5 rounded-xl border p-2.5 text-left transition-all",
                            draft.preset === t.id ? "border-primary ring-2 ring-primary/20" : "hover:border-foreground/20"
                          )}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="size-4 rounded-full border shadow-sm" style={{ backgroundColor: t.swatch }} />
                            {draft.preset === t.id && <Check className="size-3.5 text-primary" />}
                          </div>
                          <p className="text-[11px] font-semibold leading-tight">{t.name}</p>
                        </button>
                      ))}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="colors" className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Override individual colors on top of the selected theme. Clear a swatch to inherit from the theme again.
                  </p>
                  {CUSTOM_COLOR_ROWS.map((row) => (
                    <div key={row.key} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                      <Label className="text-xs">{row.label}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={draft.customColors[row.key] ?? "#64748b"}
                          onChange={(e) =>
                            patch({ customColors: { ...draft.customColors, [row.key]: e.target.value } })
                          }
                          className="size-7 cursor-pointer rounded border p-0.5"
                        />
                        {draft.customColors[row.key] && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              const next = { ...draft.customColors };
                              delete next[row.key];
                              patch({ customColors: next });
                            }}
                          >
                            <X className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="bg" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => bgInputRef.current?.click()}>
                      <Upload className="size-3.5" /> Upload Image
                    </Button>
                    {draft.background.imageData && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => patch({ background: { ...draft.background, imageData: null } })}
                      >
                        Remove
                      </Button>
                    )}
                    <input
                      ref={bgInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const dataUrl = await readFileAsDataUrl(file);
                        patch({ background: { ...draft.background, imageData: dataUrl } });
                      }}
                    />
                  </div>

                  {draft.background.imageData && (
                    <div className="space-y-4 rounded-lg border p-3">
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Apply To</p>
                        <SegmentedControl
                          value={draft.background.target}
                          options={BG_TARGETS}
                          onChange={(v) => patch({ background: { ...draft.background, target: v } })}
                        />
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">Display Mode</p>
                        <SegmentedControl
                          value={draft.background.displayMode}
                          options={BG_DISPLAY_MODES}
                          onChange={(v) => patch({ background: { ...draft.background, displayMode: v } })}
                        />
                      </div>
                      <SliderRow
                        label="Opacity"
                        unit="%"
                        value={draft.background.opacity}
                        max={100}
                        onChange={(v) => patch({ background: { ...draft.background, opacity: v } })}
                      />
                      {draft.background.displayMode !== "blur" && (
                        <SliderRow
                          label="Blur"
                          unit="px"
                          value={draft.background.blur}
                          max={24}
                          onChange={(v) => patch({ background: { ...draft.background, blur: v } })}
                        />
                      )}
                      <SliderRow
                        label="Brightness"
                        unit="%"
                        value={draft.background.brightness}
                        max={150}
                        onChange={(v) => patch({ background: { ...draft.background, brightness: v } })}
                      />
                      <SliderRow
                        label="Dim Overlay"
                        unit="%"
                        value={draft.background.dimOverlay}
                        max={100}
                        onChange={(v) => patch({ background: { ...draft.background, dimOverlay: v } })}
                      />
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="display" className="space-y-5">
                  <section>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Density</p>
                    <SegmentedControl
                      value={draft.density}
                      options={DENSITY_MODES}
                      onChange={(v) => patch({ density: v })}
                    />
                  </section>
                  <section>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Font Scale
                    </p>
                    <SegmentedControl
                      value={draft.fontScale}
                      options={FONT_SCALES}
                      onChange={(v) => patch({ fontScale: v })}
                      render={(v) => <span className="uppercase">{v}</span>}
                    />
                  </section>
                  <section className="space-y-2.5">
                    <ToggleRow
                      label="High Contrast"
                      desc="Stronger borders & focus rings for low-vision users."
                      checked={draft.highContrast}
                      onChange={(v) => patch({ highContrast: v })}
                    />
                    <ToggleRow
                      label="Large Click Targets"
                      desc="Minimum 44×44px touch targets on buttons & menu items."
                      checked={draft.largeClickTargets}
                      onChange={(v) => patch({ largeClickTargets: v })}
                    />
                    <ToggleRow
                      label="Smart Insights"
                      desc="Show the AI insight banner on the Dashboard."
                      checked={draft.showInsights}
                      onChange={(v) => patch({ showInsights: v })}
                    />
                  </section>
                </TabsContent>

                {canManageBranding && (
                  <TabsContent value="branding" className="space-y-4">
                    <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <ShieldCheck className="size-3 shrink-0" /> Organization-wide — applies for every user, not just you.
                    </p>
                    <section className="space-y-1.5">
                      <Label className="text-xs">Organization / App Name</Label>
                      <input
                        type="text"
                        value={draft.appName}
                        onChange={(e) => patch({ appName: e.target.value })}
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="e.g. Business Rules Engine"
                      />
                    </section>
                    <section className="space-y-1.5">
                      <Label className="text-xs">Tagline</Label>
                      <input
                        type="text"
                        value={draft.tagline}
                        onChange={(e) => patch({ tagline: e.target.value })}
                        className="h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                        placeholder="e.g. Decision Platform"
                      />
                    </section>
                    <section className="space-y-1.5">
                      <Label className="text-xs">Logo</Label>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => logoInputRef.current?.click()}>
                          <Upload className="size-3.5" /> Upload Logo
                        </Button>
                        {draft.logo && (
                          <Button variant="ghost" size="sm" onClick={() => patch({ logo: null })}>
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
                            patch({ logo: dataUrl });
                          }}
                        />
                      </div>
                      {draft.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={draft.logo} alt="Logo preview" className="size-12 rounded-lg border object-contain p-1" />
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Replaces the default brand mark in the sidebar, header, and login screen.
                      </p>
                    </section>
                  </TabsContent>
                )}
              </div>

              {/* Live preview mockup — reads the same CSS variables applyAppearance
                  just set on <html>, so it re-themes in step with the real app. */}
              <div className="flex-1 overflow-y-auto bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live Preview</p>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500" /> Changes apply instantly
                  </span>
                </div>

                <div className="flex overflow-hidden rounded-2xl border shadow-xl">
                  <div
                    className="flex w-14 shrink-0 flex-col items-center gap-3 py-4"
                    style={{ background: "var(--sidebar)" }}
                  >
                    <div
                      className="flex size-8 items-center justify-center rounded-lg"
                      style={{ background: "var(--sidebar-primary)", color: "var(--sidebar-primary-foreground)" }}
                    >
                      <Workflow className="size-4" />
                    </div>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="size-6 rounded-md"
                        style={
                          i === 1
                            ? { background: "var(--sidebar-primary)" }
                            : { background: "color-mix(in oklch, var(--sidebar-foreground) 18%, transparent)" }
                        }
                      />
                    ))}
                  </div>

                  <div className="flex-1 p-4" style={{ background: "var(--background)", color: "var(--foreground)" }}>
                    <div className="mb-4 flex items-center gap-2">
                      <div className="h-7 flex-1 rounded-md" style={{ background: "var(--muted)" }} />
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="size-7 rounded-md border" />
                      ))}
                      <div className="size-7 rounded-md" style={{ background: "var(--primary)" }} />
                    </div>

                    <div className="mb-3 grid grid-cols-3 gap-2.5">
                      {[
                        { label: "Revenue", value: "₹42L", trend: "+12%", up: true },
                        { label: "Sessions", value: "148", trend: "+8%", up: true },
                        { label: "Payables", value: "₹6L", trend: "-3%", up: false },
                      ].map((k) => (
                        <div key={k.label} className="rounded-lg border p-2.5" style={{ background: "var(--card)" }}>
                          <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                            {k.label}
                          </p>
                          <p className="text-sm font-bold">{k.value}</p>
                          <p
                            className={cn(
                              "flex items-center gap-0.5 text-[10px]",
                              k.up ? "text-emerald-600" : "text-red-500"
                            )}
                          >
                            {k.up ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
                            {k.trend}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mb-3 grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg border p-2.5" style={{ background: "var(--card)" }}>
                        <p className="mb-1.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                          Billing Trend
                        </p>
                        <div className="flex h-10 items-end gap-1">
                          {[40, 55, 35, 70, 50, 80].map((h, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded-sm"
                              style={{ height: `${h}%`, background: i === 5 ? "var(--primary)" : "var(--muted)" }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-lg border p-2.5" style={{ background: "var(--card)" }}>
                        <p className="mb-1.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                          Engagements
                        </p>
                        <div className="space-y-1">
                          {["Astra Mfg", "Nexora Bank", "Helio HC"].map((n, i) => (
                            <div key={n} className="flex items-center gap-1.5 text-[10px]">
                              <span className="size-1.5 rounded-full" style={{ background: `var(--chart-${i + 1})` }} />
                              {n}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {draft.showInsights && (
                      <div
                        className="mb-3 flex items-center gap-2 rounded-lg p-2.5 text-[10px]"
                        style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                      >
                        <Sparkles className="size-3 shrink-0" /> Smart Insight: 2 high-risk engagements need attention
                      </div>
                    )}

                    <div className="flex gap-2">
                      <div
                        className="rounded-lg px-3 py-1.5 text-[10px] font-medium"
                        style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
                      >
                        New Engagement
                      </div>
                      <div className="rounded-lg border px-3 py-1.5 text-[10px] font-medium">Export CSV</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
