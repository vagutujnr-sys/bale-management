import { useState } from "react";
import appIcon from "@/assets/leaf-appicon.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  registerFarmerAccount,
  signInWithPhonePin,
  type AccountKind,
  type AccountSignInResult,
} from "@/lib/account-auth";
import {
  getFarmerProfileCompletion,
  farmerProfileFields,
  type FarmerProfileDraft,
} from "@/lib/farmer-profile";
import { normalizePhoneNumber } from "@/lib/phone-auth";

const fieldLabels: Record<keyof FarmerProfileDraft, string> = {
  growerNumber: "Grower number",
  nationalId: "National ID",
  firstName: "First name",
  surname: "Surname",
  farmName: "Farm name",
  province: "Province",
  district: "District",
  ward: "Ward",
  phone: "Mobile number",
  alternatePhone: "Alternate mobile number",
  contractingCompany: "Contracting company",
};

export function MobileLogin({
  appName,
  idLabel,
  onSignIn,
  accountKind = "staff",
  allowPublicSignup = false,
}: {
  appName: string;
  idLabel: string;
  onSignIn: (profile: AccountSignInResult) => void;
  accountKind?: AccountKind;
  allowPublicSignup?: boolean;
}) {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [unlinked, setUnlinked] = useState(false);
  const [farmer, setFarmer] = useState<FarmerProfileDraft>({
    growerNumber: "",
    nationalId: "",
    firstName: "",
    surname: "",
    farmName: "",
    province: "",
    district: "",
    ward: "",
    phone: "",
    alternatePhone: "",
    contractingCompany: "",
  });
  const completion = getFarmerProfileCompletion(farmer);

  const completeSignIn = async (mobile: string, password: string) => {
    setBusy(true);
    setError("");
    setUnlinked(false);
    try {
      const result = await signInWithPhonePin(mobile, password, accountKind);
      if (result.status === "unlinked") {
        setUnlinked(true);
      } else {
        onSignIn(result);
      }
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const updateFarmerField = (field: keyof FarmerProfileDraft, value: string) => {
    setFarmer((current) => ({ ...current, [field]: value }));
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="bg-hero px-6 pb-16 pt-14 text-primary-foreground">
        <p className="text-sm opacity-80">Welcome to</p>
        <h1 className="text-3xl font-extrabold">{appName}</h1>
      </div>
      {unlinked ? (
        <section
          role="status"
          className="-mt-10 mx-5 space-y-3 rounded-3xl bg-card p-6 shadow-card"
        >
          <h2 className="text-center text-lg font-bold">Account not linked</h2>
          <p className="text-center text-sm text-muted-foreground">
            This account is not linked to an active profile yet. Please contact the office to finish
            linking it.
          </p>
          <button
            type="button"
            className="w-full text-sm font-medium text-primary"
            onClick={() => setUnlinked(false)}
          >
            Back to sign in
          </button>
        </section>
      ) : creating && allowPublicSignup ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            try {
              const normalizedPhone = normalizePhoneNumber(farmer.phone);
              const result = await registerFarmerAccount({
                farmer: { ...farmer, phone: normalizedPhone },
                pin,
              });
              if (result.status === "unlinked") setUnlinked(true);
              else onSignIn(result);
            } catch (registrationError) {
              setError(
                registrationError instanceof Error
                  ? registrationError.message
                  : "Registration failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
          className="-mt-10 mx-5 space-y-4 rounded-3xl bg-card p-6 shadow-card"
        >
          <h2 className="text-center text-lg font-bold">Complete your farmer profile</h2>
          <div aria-label={`Profile ${completion}% complete`} className="space-y-1">
            <div className="flex justify-between text-xs font-medium">
              <span>Profile completion</span>
              <span>{completion}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>
          {farmerProfileFields.map((field) => (
            <label key={field} className="block space-y-1.5">
              <span className="text-sm font-medium">{fieldLabels[field]}</span>
              <Input
                autoComplete={field === "phone" || field === "alternatePhone" ? "tel" : undefined}
                inputMode={field === "phone" || field === "alternatePhone" ? "tel" : undefined}
                value={farmer[field]}
                onChange={(event) => updateFarmerField(field, event.target.value)}
                required
              />
            </label>
          ))}
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Six-digit PIN</span>
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
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full rounded-xl"
            disabled={busy || completion < 100 || pin.length !== 6}
          >
            {busy ? "Creating account..." : "Create account"}
          </Button>
          <button
            type="button"
            className="w-full text-sm font-medium text-primary"
            onClick={() => {
              setCreating(false);
              setError("");
            }}
          >
            Already have an account? Sign in
          </button>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void completeSignIn(phone, pin);
          }}
          className="-mt-10 mx-5 space-y-4 rounded-3xl bg-card p-6 shadow-card"
        >
          <img
            src={appIcon}
            alt="Bale Contract System"
            className="mx-auto h-14 w-14 object-contain"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{idLabel}</span>
            <Input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
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
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </Button>
          {allowPublicSignup && (
            <button
              type="button"
              className="w-full text-sm font-medium text-primary"
              onClick={() => {
                setCreating(true);
                setError("");
              }}
            >
              Create a Farmer account
            </button>
          )}
        </form>
      )}
    </div>
  );
}
