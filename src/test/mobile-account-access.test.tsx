import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileAccountAccess } from "@/components/mobile/account-access";
import { LanguageProvider } from "@/lib/language";
import { checkPhoneAccount, createPhoneAccount } from "@/lib/account-auth";

vi.mock("@/lib/account-auth", () => ({
  checkPhoneAccount: vi.fn(),
  createPhoneAccount: vi.fn(),
  signInWithPhonePin: vi.fn(),
}));

describe("mobile account creation", () => {
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
    vi.mocked(checkPhoneAccount).mockResolvedValue(false);
    vi.mocked(createPhoneAccount).mockReset();
  });

  it("checks a composed international number and requires terms acceptance", async () => {
    render(
      <LanguageProvider>
        <MobileAccountAccess
          title="Farmer Bale Manager"
          accountKind="farmer"
          onAuthenticated={() => {}}
        />
      </LanguageProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText("77 123 4567"), {
      target: { value: "077 123 4567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(checkPhoneAccount).toHaveBeenCalledWith("+263771234567");
    });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Tariro Moyo" },
    });
    fireEvent.change(screen.getByLabelText("Set a six-digit PIN"), {
      target: { value: "123456" },
    });

    const form = screen.getByRole("button", { name: "Create account" }).closest("form");
    const termsCheckbox = screen.getByRole("checkbox");
    expect(termsCheckbox).toBeRequired();
    expect(form?.checkValidity()).toBe(false);

    fireEvent.click(termsCheckbox);
    expect(form?.checkValidity()).toBe(true);
    expect(createPhoneAccount).not.toHaveBeenCalled();
  });
});
