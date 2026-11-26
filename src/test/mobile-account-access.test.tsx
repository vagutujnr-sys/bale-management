import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MobileAccountAccess } from "@/components/mobile/account-access";
import { LanguageProvider } from "@/lib/language";
import { checkPhoneAccount, createPhoneAccount, signInWithPhonePin } from "@/lib/account-auth";
import { toast } from "sonner";

vi.mock("@/lib/account-auth", () => ({
  checkPhoneAccount: vi.fn(),
  createPhoneAccount: vi.fn(),
  signInWithPhonePin: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
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
    vi.mocked(signInWithPhonePin).mockReset();
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

  it("shows a welcome toast when account creation succeeds", async () => {
    const account = {
      status: "linked" as const,
      profile: { displayName: "Tariro Moyo", role: "farmer" },
    };
    const onAuthenticated = vi.fn();
    vi.mocked(createPhoneAccount).mockResolvedValue(account);

    render(
      <LanguageProvider>
        <MobileAccountAccess
          title="Farmer Bale Manager"
          accountKind="farmer"
          onAuthenticated={onAuthenticated}
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
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Welcome, Tariro Moyo", {
        description: "Your account is ready to use.",
      });
      expect(onAuthenticated).toHaveBeenCalledWith(account);
    });
  });

  it("automatically signs a returning user in after the sixth keypad digit", async () => {
    const account = {
      status: "linked" as const,
      profile: { displayName: "Tariro Moyo", role: "farmer" },
    };
    const onAuthenticated = vi.fn();
    vi.mocked(checkPhoneAccount).mockResolvedValue(true);
    vi.mocked(signInWithPhonePin).mockResolvedValue(account);

    render(
      <LanguageProvider>
        <MobileAccountAccess
          title="Farmer Bale Manager"
          accountKind="farmer"
          onAuthenticated={onAuthenticated}
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

    expect(await screen.findByText("Enter your six-digit PIN")).toBeVisible();
    for (const digit of "123456") {
      fireEvent.click(screen.getByRole("button", { name: digit }));
    }

    await waitFor(() => {
      expect(signInWithPhonePin).toHaveBeenCalledWith("+263771234567", "123456", "farmer");
      expect(onAuthenticated).toHaveBeenCalledWith(account);
    });
    expect(screen.queryByRole("button", { name: "Sign in" })).not.toBeInTheDocument();
    expect(screen.queryByText("Signing in to")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change number" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use another number" })).toBeVisible();
  });
});
