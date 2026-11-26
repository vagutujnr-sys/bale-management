import { createContext, useContext } from "react";

export type AppLanguage = "en" | "sn" | "nd";

export type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (text: string, values?: Record<string, string | number>) => string;
};

export const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (text) => text,
});

export function useLanguage() {
  return useContext(LanguageContext);
}
