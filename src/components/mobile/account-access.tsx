import { useState } from "react";
import appIcon from "@/assets/leaf-appicon.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [pin, setPin] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [code, setCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const start = () =>
    run(async () => {
      const exists = await checkPhoneAccount(phone);
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
    <main className="flex flex-1 flex-col items-center overflow-y-auto px-6 pb-8 pt-12">
      <img src={appIcon} alt="" className="h-24 w-24 object-contain" />
      <h1 className="mt-3 text-center text-2xl font-extrabold text-primary-deep">{title}</h1>
      <div className="mt-10 w-full max-w-sm">
        {step === "phone" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void start();
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">Mobile number</span>
              <Input
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
            </label>
            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
              {busy ? "Checking..." : "Continue"}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (code !== expectedCode) {
                setError("Enter the displayed code to continue.");
                return;
              }
              setError("");
              setStep("create");
            }}
          >
            <label className="block space-y-2">
              <span className="text-sm font-medium">One-time code</span>
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
              Continue
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
              <span className="text-sm font-medium">Six-digit PIN</span>
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
              {busy ? "Signing in..." : "Sign in"}
            </Button>
            <button
              type="button"
              className="w-full text-sm font-medium text-primary"
              onClick={() => {
                setPin("");
                setStep("phone");
              }}
            >
              Use another number
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
              <span className="text-sm font-medium">Full name</span>
              <Input
                autoComplete="name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">Set a six-digit PIN</span>
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
            <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
              {busy ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-4 text-center text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
