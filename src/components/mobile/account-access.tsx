import { useState } from "react";
import appIcon from "@/assets/leaf-appicon.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "@/components/mobile/language-selector";
import { PhoneNumberField } from "@/components/mobile/phone-number-field";
import { useLanguage } from "@/lib/language-context";
import { getInternationalPhone } from "@/lib/phone-number";
import {
  checkPhoneAccount,
  createPhoneAccount,
  signInWithPhonePin,
  type AccountSignInResult,
} from "@/lib/account-auth";
import type { AccountKind } from "@/lib/account-auth";

type AccountAccessKind = Extract<AccountKind, "farmer" | "driver">;
type Step = "phone" | "otp" | "pin" | "create";

function createDisplayCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(values[0]! % 1_000_000).padStart(6, "0");
}

export function MobileAccountAccess({
  accountKind,
  title,
  onAuthenticated,
}: {
  accountKind: AccountAccessKind;
  title: string;
  onAuthenticated: (account: AccountSignInResult) => void;
}) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("+263");
  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { t } = useLanguage();

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(t(actionError instanceof Error ? actionError.message : "Something went wrong."));
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const internationalPhone = getInternationalPhone(countryCode, phoneNumber);
      setPhone(internationalPhone);
      const exists = await checkPhoneAccount(internationalPhone);
      if (exists) {
        setStep("pin");
        return;
      }
      const nextCode = createDisplayCode();
      setExpectedCode(nextCode);
      setCode(nextCode);
      setStep("otp");
    });

  const signIn = () =>
    run(async () => {
      const account = await signInWithPhonePin(phone, pin, accountKind);
      if (account.status === "unlinked") {
        throw new Error("This account needs to be linked by the office.");
      }
      onAuthenticated(account);
    });

  const createAccount = () =>
    run(async () => {
      const account = await createPhoneAccount({
        phone,
        pin,
        displayName,
        accountKind,
      });
      if (account.status === "unlinked") {
        throw new Error("Your account could not be linked. Please contact the office.");
      }
      onAuthenticated(account);
    });

  return (
    <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 pb-8 pt-4">
      <header className="flex w-full justify-end">
        <LanguageSelector />
      </header>
      <img src={appIcon} alt="" className="h-24 w-24 object-contain" />
      <h1 className="mt-3 text-center text-2xl font-extrabold text-primary-deep">{t(title)}</h1>
      <div className="mt-10 w-full max-w-sm">
        {step === "phone" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void start();
            }}
          >
            <PhoneNumberField
              label="Mobile number"
              countryCode={countryCode}
              number={phoneNumber}
              onCountryCodeChange={setCountryCode}
              onNumberChange={setPhoneNumber}
            />
            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
              {busy ? t("Checking...") : t("Continue")}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (code !== expectedCode) {
                setError(t("Enter the displayed code to continue."));
                return;
              }
              setError("");
              setStep("create");
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t("One-time code")}</span>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </label>
            <Button type="submit" size="lg" className="w-full rounded-xl">
              {t("Continue")}
            </Button>
          </form>
        )}

        {step === "pin" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void signIn();
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t("Six-digit PIN")}</span>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={6}
                pattern="[0-9]{6}"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                required
              />
            </label>
            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
              {busy ? t("Signing in...") : t("Sign in")}
            </Button>
            <button
              type="button"
              className="w-full text-sm font-medium text-primary"
              onClick={() => {
                setPin("");
                setPhoneNumber("");
                setPhone("");
                setStep("phone");
              }}
            >
              {t("Use another number")}
            </button>
          </form>
        )}

        {step === "create" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void createAccount();
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t("Full name")}</span>
              <Input
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t("Set a six-digit PIN")}</span>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={6}
                pattern="[0-9]{6}"
                value={pin}
                onChange={(event) => setPin(event.target.value)}
                required
              />
            </label>
            <label className="flex items-start gap-2 text-sm leading-5">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-primary"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
              />
              <span>
                {t("I agree to the")}{" "}
                <a
                  className="font-semibold text-primary underline"
                  href="/#terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Terms and conditions")}
                </a>
              </span>
            </label>
            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
              {busy ? t("Creating account...") : t("Create account")}
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <footer className="mt-auto pt-8 text-center text-xs text-muted-foreground">
        <a className="underline" href="/#terms" target="_blank" rel="noreferrer">
          {t("Terms and conditions")}
        </a>
      </footer>
    </main>
  );
}
