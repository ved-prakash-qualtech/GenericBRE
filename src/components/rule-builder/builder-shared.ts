"use client";

import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Drag payload — HTML5 dataTransfer contents aren't readable during dragover
// (only on drop), so drop-target highlighting needs the payload in a module
// variable both the AttributePanel (drag source for new fields) and the
// ConditionGroupEditor (drag source for existing nodes + all drop targets)
// can see synchronously.
// ---------------------------------------------------------------------------

export type BuilderDragPayload =
  | { kind: "node"; nodeId: string }
  | { kind: "new-field"; fieldKey: string };

let currentDrag: BuilderDragPayload | null = null;

export function setDragPayload(payload: BuilderDragPayload) {
  currentDrag = payload;
}
export function getDragPayload(): BuilderDragPayload | null {
  return currentDrag;
}
export function clearDragPayload() {
  currentDrag = null;
}

// ---------------------------------------------------------------------------
// Favorites + Recently Used fields — per-device personalization (localStorage),
// same tier as the builder's autosaved drafts. Reactive via a tiny external
// store so the AttributePanel updates when ConditionEditor records a pick.
// ---------------------------------------------------------------------------

const FAV_KEY = "bre-fav-fields";
const RECENT_KEY = "bre-recent-fields";
const RECENT_MAX = 8;

const listeners = new Set<() => void>();
// useSyncExternalStore needs referentially-stable snapshots — cache the parsed
// arrays and only replace them on an actual write.
let favCache: string[] | null = null;
let recentCache: string[] | null = null;
const EMPTY: string[] = [];

function readList(key: string): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : EMPTY;
  } catch {
    return EMPTY;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getFavoriteFields(): string[] {
  if (favCache === null) favCache = readList(FAV_KEY);
  return favCache;
}

export function getRecentFields(): string[] {
  if (recentCache === null) recentCache = readList(RECENT_KEY);
  return recentCache;
}

export function toggleFavoriteField(key: string) {
  const current = getFavoriteFields();
  favCache = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
  window.localStorage.setItem(FAV_KEY, JSON.stringify(favCache));
  emit();
}

export function recordRecentField(key: string) {
  if (!key) return;
  const next = [key, ...getRecentFields().filter((k) => k !== key)].slice(0, RECENT_MAX);
  // Skip the write (and re-render) when the pick is already most-recent.
  if (next.length === recentCache?.length && next.every((k, i) => k === recentCache![i])) return;
  recentCache = next;
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(recentCache));
  emit();
}

export function useFavoriteFields(): string[] {
  return useSyncExternalStore(subscribe, getFavoriteFields, () => EMPTY);
}

export function useRecentFields(): string[] {
  return useSyncExternalStore(subscribe, getRecentFields, () => EMPTY);
}
