import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageSelector } from "@/components/mobile/language-selector";
import { LanguageProvider } from "@/lib/language";
import { useLanguage } from "@/lib/language-context";

function LanguageProbe() {
  const { t } = useLanguage();
  return (
    <>
      <LanguageSelector />
      <p>{t("Home")}</p>
    </>
  );
}

describe("mobile app language selection", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, String(value)),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
  });

  it("translates app copy, persists the selection, and updates the document language", async () => {
    render(
      <LanguageProvider>
        <LanguageProbe />
      </LanguageProvider>,
    );

    fireEvent.change(screen.getByRole("combobox", { name: "Language" }), {
      target: { value: "sn" },
    });

    expect(await screen.findByText("Kumba")).toBeVisible();
    await waitFor(() => {
      expect(window.localStorage.getItem("bale-contract-language")).toBe("sn");
      expect(document.documentElement.lang).toBe("sn");
    });
  });
});
