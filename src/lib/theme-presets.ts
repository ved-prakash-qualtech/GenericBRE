import { ThemePreset } from "./store";

export interface ThemeDefinition {
  id: ThemePreset;
  name: string;
  description: string;
  swatch: string; // hex used for the little preview dot
  light: Record<string, string>;
  dark: Record<string, string>;
}

// Each preset overrides the primary/accent/sidebar/chart tokens defined in globals.css.
// Base neutrals (background/card/border/etc.) come from globals.css and only shift
// subtly per-preset so text contrast stays predictable.
export const THEME_PRESETS: ThemeDefinition[] = [
  {
    id: "client",
    name: "QualtechEdge Brand",
    description: "The client's own visual identity — default for every session.",
    swatch: "#155DFC",
    light: {
      "--primary": "oklch(0.47 0.19 259)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--ring": "oklch(0.47 0.19 259)",
      "--accent": "oklch(0.94 0.03 259)",
      "--accent-foreground": "oklch(0.3 0.1 259)",
      "--sidebar": "oklch(0.16 0.04 260)",
      "--sidebar-foreground": "oklch(0.93 0.01 260)",
      "--sidebar-primary": "oklch(0.6 0.19 259)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.24 0.05 260)",
      "--sidebar-accent-foreground": "oklch(0.95 0.01 260)",
      "--sidebar-border": "oklch(0.26 0.04 260)",
      "--chart-1": "oklch(0.55 0.19 259)",
      "--chart-2": "oklch(0.7 0.15 200)",
      "--chart-3": "oklch(0.75 0.16 150)",
      "--chart-4": "oklch(0.72 0.18 60)",
      "--chart-5": "oklch(0.65 0.22 25)",
    },
    dark: {
      "--primary": "oklch(0.65 0.19 259)",
      "--primary-foreground": "oklch(0.15 0 0)",
      "--ring": "oklch(0.65 0.19 259)",
      "--accent": "oklch(0.27 0.05 259)",
      "--accent-foreground": "oklch(0.93 0.02 259)",
      "--sidebar": "oklch(0.13 0.03 260)",
      "--sidebar-foreground": "oklch(0.93 0.01 260)",
      "--sidebar-primary": "oklch(0.65 0.19 259)",
      "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.22 0.04 260)",
      "--sidebar-accent-foreground": "oklch(0.95 0.01 260)",
      "--sidebar-border": "oklch(0.24 0.04 260)",
      "--chart-1": "oklch(0.65 0.19 259)",
      "--chart-2": "oklch(0.7 0.15 200)",
      "--chart-3": "oklch(0.75 0.16 150)",
      "--chart-4": "oklch(0.72 0.18 60)",
      "--chart-5": "oklch(0.65 0.22 25)",
    },
  },
  {
    id: "enterprise-blue",
    name: "Enterprise Blue",
    description: "Clean, professional — the safe enterprise default.",
    swatch: "#2563EB",
    light: {
      "--primary": "oklch(0.5 0.18 255)",
      "--primary-foreground": "oklch(0.98 0 0)",
      "--ring": "oklch(0.5 0.18 255)",
      "--accent": "oklch(0.95 0.02 255)",
      "--accent-foreground": "oklch(0.32 0.1 255)",
      "--sidebar": "oklch(0.99 0.002 255)",
      "--sidebar-foreground": "oklch(0.2 0.02 255)",
      "--sidebar-primary": "oklch(0.5 0.18 255)",
      "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.95 0.02 255)",
      "--sidebar-accent-foreground": "oklch(0.3 0.1 255)",
      "--sidebar-border": "oklch(0.9 0.01 255)",
      "--chart-1": "oklch(0.5 0.18 255)", "--chart-2": "oklch(0.65 0.16 220)",
      "--chart-3": "oklch(0.72 0.14 190)", "--chart-4": "oklch(0.6 0.12 280)", "--chart-5": "oklch(0.8 0.1 230)",
    },
    dark: {
      "--primary": "oklch(0.68 0.17 255)", "--primary-foreground": "oklch(0.15 0 0)",
      "--ring": "oklch(0.68 0.17 255)", "--accent": "oklch(0.27 0.05 255)", "--accent-foreground": "oklch(0.93 0.02 255)",
      "--sidebar": "oklch(0.18 0.02 255)", "--sidebar-foreground": "oklch(0.93 0.01 255)",
      "--sidebar-primary": "oklch(0.68 0.17 255)", "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.26 0.04 255)", "--sidebar-accent-foreground": "oklch(0.95 0.01 255)",
      "--sidebar-border": "oklch(0.28 0.03 255)",
      "--chart-1": "oklch(0.68 0.17 255)", "--chart-2": "oklch(0.65 0.16 220)",
      "--chart-3": "oklch(0.72 0.14 190)", "--chart-4": "oklch(0.6 0.12 280)", "--chart-5": "oklch(0.8 0.1 230)",
    },
  },
  {
    id: "modern-purple",
    name: "Modern Purple",
    description: "Vibrant, premium — for consumer-facing programs.",
    swatch: "#7C3AED",
    light: {
      "--primary": "oklch(0.5 0.22 300)", "--primary-foreground": "oklch(0.98 0 0)",
      "--ring": "oklch(0.5 0.22 300)", "--accent": "oklch(0.95 0.03 300)", "--accent-foreground": "oklch(0.34 0.14 300)",
      "--sidebar": "oklch(0.2 0.05 300)", "--sidebar-foreground": "oklch(0.93 0.02 300)",
      "--sidebar-primary": "oklch(0.65 0.22 300)", "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.28 0.07 300)", "--sidebar-accent-foreground": "oklch(0.95 0.02 300)",
      "--sidebar-border": "oklch(0.3 0.06 300)",
      "--chart-1": "oklch(0.55 0.22 300)", "--chart-2": "oklch(0.65 0.2 330)",
      "--chart-3": "oklch(0.7 0.16 20)", "--chart-4": "oklch(0.68 0.14 260)", "--chart-5": "oklch(0.75 0.12 340)",
    },
    dark: {
      "--primary": "oklch(0.7 0.2 300)", "--primary-foreground": "oklch(0.12 0 0)",
      "--ring": "oklch(0.7 0.2 300)", "--accent": "oklch(0.3 0.07 300)", "--accent-foreground": "oklch(0.94 0.02 300)",
      "--sidebar": "oklch(0.16 0.04 300)", "--sidebar-foreground": "oklch(0.93 0.02 300)",
      "--sidebar-primary": "oklch(0.7 0.2 300)", "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.26 0.06 300)", "--sidebar-accent-foreground": "oklch(0.95 0.02 300)",
      "--sidebar-border": "oklch(0.3 0.06 300)",
      "--chart-1": "oklch(0.7 0.2 300)", "--chart-2": "oklch(0.65 0.2 330)",
      "--chart-3": "oklch(0.7 0.16 20)", "--chart-4": "oklch(0.68 0.14 260)", "--chart-5": "oklch(0.75 0.12 340)",
    },
  },
  {
    id: "emerald-green",
    name: "Emerald Green",
    description: "Financial analytics — calm, confident, money-forward.",
    swatch: "#059669",
    light: {
      "--primary": "oklch(0.5 0.14 165)", "--primary-foreground": "oklch(0.98 0 0)",
      "--ring": "oklch(0.5 0.14 165)", "--accent": "oklch(0.94 0.03 165)", "--accent-foreground": "oklch(0.32 0.08 165)",
      "--sidebar": "oklch(0.18 0.03 165)", "--sidebar-foreground": "oklch(0.93 0.02 165)",
      "--sidebar-primary": "oklch(0.6 0.14 165)", "--sidebar-primary-foreground": "oklch(0.98 0 0)",
      "--sidebar-accent": "oklch(0.26 0.04 165)", "--sidebar-accent-foreground": "oklch(0.95 0.02 165)",
      "--sidebar-border": "oklch(0.28 0.04 165)",
      "--chart-1": "oklch(0.55 0.14 165)", "--chart-2": "oklch(0.68 0.14 140)",
      "--chart-3": "oklch(0.72 0.12 100)", "--chart-4": "oklch(0.6 0.1 200)", "--chart-5": "oklch(0.78 0.14 85)",
    },
    dark: {
      "--primary": "oklch(0.68 0.15 165)", "--primary-foreground": "oklch(0.12 0 0)",
      "--ring": "oklch(0.68 0.15 165)", "--accent": "oklch(0.28 0.05 165)", "--accent-foreground": "oklch(0.94 0.02 165)",
      "--sidebar": "oklch(0.15 0.02 165)", "--sidebar-foreground": "oklch(0.93 0.02 165)",
      "--sidebar-primary": "oklch(0.68 0.15 165)", "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.25 0.04 165)", "--sidebar-accent-foreground": "oklch(0.95 0.02 165)",
      "--sidebar-border": "oklch(0.28 0.04 165)",
      "--chart-1": "oklch(0.68 0.15 165)", "--chart-2": "oklch(0.68 0.14 140)",
      "--chart-3": "oklch(0.72 0.12 100)", "--chart-4": "oklch(0.6 0.1 200)", "--chart-5": "oklch(0.78 0.14 85)",
    },
  },
  {
    id: "midnight-navy",
    name: "Midnight Navy",
    description: "Dark, with neon highlights — a bold trading-desk feel.",
    swatch: "#22D3EE",
    light: {
      "--primary": "oklch(0.45 0.16 250)", "--primary-foreground": "oklch(0.98 0 0)",
      "--ring": "oklch(0.6 0.18 195)", "--accent": "oklch(0.94 0.03 195)", "--accent-foreground": "oklch(0.3 0.08 220)",
      "--sidebar": "oklch(0.14 0.03 250)", "--sidebar-foreground": "oklch(0.9 0.02 200)",
      "--sidebar-primary": "oklch(0.75 0.16 195)", "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.22 0.05 250)", "--sidebar-accent-foreground": "oklch(0.92 0.03 195)",
      "--sidebar-border": "oklch(0.26 0.05 250)",
      "--chart-1": "oklch(0.75 0.16 195)", "--chart-2": "oklch(0.55 0.16 250)",
      "--chart-3": "oklch(0.8 0.15 150)", "--chart-4": "oklch(0.7 0.2 320)", "--chart-5": "oklch(0.75 0.18 60)",
    },
    dark: {
      "--background": "oklch(0.11 0.02 255)", "--foreground": "oklch(0.94 0.02 200)",
      "--card": "oklch(0.15 0.025 255)", "--card-foreground": "oklch(0.94 0.02 200)",
      "--popover": "oklch(0.15 0.025 255)", "--popover-foreground": "oklch(0.94 0.02 200)",
      "--primary": "oklch(0.78 0.17 195)", "--primary-foreground": "oklch(0.1 0 0)",
      "--ring": "oklch(0.78 0.17 195)", "--accent": "oklch(0.22 0.05 250)", "--accent-foreground": "oklch(0.92 0.03 195)",
      "--border": "oklch(1 0 0 / 12%)", "--input": "oklch(1 0 0 / 15%)",
      "--sidebar": "oklch(0.09 0.02 255)", "--sidebar-foreground": "oklch(0.9 0.02 200)",
      "--sidebar-primary": "oklch(0.78 0.17 195)", "--sidebar-primary-foreground": "oklch(0.1 0 0)",
      "--sidebar-accent": "oklch(0.18 0.04 255)", "--sidebar-accent-foreground": "oklch(0.92 0.03 195)",
      "--sidebar-border": "oklch(1 0 0 / 10%)",
      "--chart-1": "oklch(0.78 0.17 195)", "--chart-2": "oklch(0.65 0.18 250)",
      "--chart-3": "oklch(0.8 0.15 150)", "--chart-4": "oklch(0.7 0.2 320)", "--chart-5": "oklch(0.75 0.18 60)",
    },
  },
];

export function getThemeDefinition(id: ThemePreset): ThemeDefinition {
  return THEME_PRESETS.find((t) => t.id === id) ?? THEME_PRESETS[0];
}
