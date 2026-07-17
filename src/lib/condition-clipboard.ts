"use client";

import { useSyncExternalStore } from "react";
import { Condition, ConditionGroup } from "./types";
import { cloneNodeWithFreshIds } from "./condition-tree";

type ClipboardNode = Condition | ConditionGroup;

// localStorage-backed so "copy a group in one rule, paste it into another"
// works across Rule Builder sessions — same per-device personalization tier
// as the builder's autosaved drafts. Paste always re-clones with fresh ids
// (see pasteFromClipboard), so the stored ids can never collide with a tree.
const STORAGE_KEY = "bre-condition-clipboard";

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function copyToClipboard(nodes: ClipboardNode[]) {
  if (nodes.length === 0) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
  emit();
}

export function readClipboard(): ClipboardNode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClipboardNode[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Fresh-id clones of the clipboard contents, ready to insert into any tree. */
export function pasteFromClipboard(): ClipboardNode[] {
  return readClipboard().map((n) => cloneNodeWithFreshIds(n));
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Cross-tab copies too — the storage event only fires in OTHER tabs, which
  // is exactly the gap the in-tab `emit()` above doesn't cover.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): number {
  const raw = typeof window === "undefined" ? null : window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  try {
    const parsed = JSON.parse(raw) as ClipboardNode[];
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

/** Reactive count of nodes on the clipboard — drives Paste-button enablement. */
export function useConditionClipboard(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}
