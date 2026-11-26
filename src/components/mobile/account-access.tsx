import { Delete, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
      return true;
    } catch (actionError) {
      setError(t(actionError instanceof Error ? actionError.message : "Something went wrong."));
      return false;
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

  const signIn = async (enteredPin: string) => {
    const succeeded = await run(async () => {
      const account = await signInWithPhonePin(phone, enteredPin, accountKind);
      if (account.status === "unlinked") {
        throw new Error("This account needs to be linked by the office.");
      }
      onAuthenticated(account);
    });
    if (!succeeded) setPin("");
  };

  const enterPinDigit = (digit: string) => {
    if (busy || pin.length >= 6) return;
    const nextPin = `${pin}${digit}`;
    setPin(nextPin);
    setError("");
    if (nextPin.length === 6) void signIn(nextPin);
  };

  const deletePinDigit = () => {
    if (busy) return;
    setPin((current) => current.slice(0, -1));
    setError("");
  };

  const changeNumber = () => {
    setPin("");
    setPhoneNumber("");
    setPhone("");
    setError("");
    setStep("phone");
  };

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
      toast.success(t("Welcome, {name}", { name: displayName.trim() || t("Farmer") }), {
        description: t("Your account is ready to use."),
      });
      onAuthenticated(account);
    });

  return (
    <main className="relative flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-gradient-to-b from-primary/10 via-background to-background px-5 pb-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <header className="relative z-10 flex min-h-12 w-full max-w-sm justify-end pt-2">
        <LanguageSelector />
      </header>
      <section className="relative z-10 flex w-full max-w-sm flex-col items-center pb-4 pt-3">
        <img src={appIcon} alt="" className="h-32 w-32 object-contain drop-shadow-md" />
        <p className="mt-5 text-center text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
          {t("Tobacco Contract System")}
        </p>
        <h1 className="mt-1 text-center text-2xl font-extrabold tracking-tight text-primary-deep">
          {t(title)}
        </h1>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          {t(step === "pin" ? "Welcome back" : "Secure account access")}
        </p>
        <div className="mt-7 w-full space-y-6">
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
              <Button
                type="submit"
                size="lg"
                className="w-full rounded-2xl shadow-sm"
                disabled={busy}
              >
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
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <LockKeyhole aria-hidden="true" className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold">{t("Enter your six-digit PIN")}</p>
                <div
                  role="group"
                  aria-label={t("{count} of 6 digits entered", { count: pin.length })}
                  className="mt-4 flex justify-center gap-3"
                >
                  {Array.from({ length: 6 }, (_, index) => (
                    <span
                      key={index}
                      aria-hidden="true"
                      className={`h-3 w-3 rounded-full transition-colors ${
                        index < pin.length ? "bg-primary" : "bg-border"
                      }`}
                    />
                  ))}
                </div>
                <p className="sr-only" aria-live="polite">
                  {t("{count} of 6 digits entered", { count: pin.length })}
                </p>
              </div>
              <PinPad
                disabled={busy}
                onDigit={enterPinDigit}
                onDelete={deletePinDigit}
                deleteLabel={t("Delete last digit")}
              />
              <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                {busy ? t("Signing in...") : t("PIN signs you in automatically")}
              </p>
              <button
                type="button"
                className="w-full text-sm font-medium text-primary"
                onClick={changeNumber}
              >
                {t("Use another number")}
              </button>
            </div>
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
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </section>
      <footer className="relative z-10 mt-auto pt-5 text-center text-xs text-muted-foreground">
        <a className="underline" href="/#terms" target="_blank" rel="noreferrer">
          {t("Terms and conditions")}
        </a>
      </footer>
    </main>
  );
}

function PinPad({
  disabled,
  onDigit,
  onDelete,
  deleteLabel,
}: {
  disabled: boolean;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  deleteLabel: string;
}) {
  return (
    <div className="mx-auto grid max-w-[264px] grid-cols-3 gap-2.5">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button
          key={digit}
          type="button"
          aria-label={digit}
          disabled={disabled}
          onClick={() => onDigit(digit)}
          className="h-14 rounded-2xl border border-border/70 bg-background text-xl font-semibold shadow-sm transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {digit}
        </button>
      ))}
      <span aria-hidden="true" />
      <button
        type="button"
        aria-label="0"
        disabled={disabled}
        onClick={() => onDigit("0")}
        className="h-14 rounded-2xl border border-border/70 bg-background text-xl font-semibold shadow-sm transition hover:border-primary/40 hover:bg-primary/5 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        0
      </button>
      <button
        type="button"
        aria-label={deleteLabel}
        disabled={disabled}
        onClick={onDelete}
        className="grid h-14 place-items-center rounded-2xl border border-border/70 bg-background text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Delete aria-hidden="true" className="h-5 w-5" />
      </button>
    </div>
  );
}
