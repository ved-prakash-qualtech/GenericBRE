"use client";

import { useAppStore } from "./store";
import { translate, TranslationKey, LanguageCode } from "./i18n";

/** t(key) reads the committed appearance.language from the store. Use
 *  useTranslateFor(language) instead when translating a draft value that
 *  hasn't been committed yet (e.g. Appearance Studio's Live Preview). */
export function useTranslate() {
  const language = useAppStore((s) => s.appearance.language) as LanguageCode;
  return (key: TranslationKey) => translate(key, language);
}

export function useTranslateFor(language: LanguageCode) {
  return (key: TranslationKey) => translate(key, language);
}
