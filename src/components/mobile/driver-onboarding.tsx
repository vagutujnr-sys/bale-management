import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  completeDriverOnboarding,
  refreshAccountProfile,
  saveAccountOnboarding,
  type LinkedAccountProfile,
} from "@/lib/account-auth";
import { driverRegistrationFields, type DriverRegistrationDraft } from "@/lib/driver-profile";

const steps = ["transporter", "driver", "vehicle"] as const;
type Step = (typeof steps)[number];
type Registration = Omit<DriverRegistrationDraft, "pin">;

const labels: Record<keyof Registration, string> = {
  transporterName: "Transporter or company name",
  transporterRegistrationNumber: "Transporter registration number",
  transporterContactPerson: "Contact person",
  transporterPhone: "Transporter contact mobile",
  transporterAddress: "Transporter address",
  transporterPermitNumber: "Transporter permit number",
  transporterPermitExpiresOn: "Transporter permit expiry",
  fullName: "Driver full name",
  nationalId: "Driver national ID",
  phone: "Driver mobile number",
  licenceNumber: "Driver licence number",
  licenceClass: "Licence class",
  licenceExpiresOn: "Driver licence expiry",
  vehicleRegistrationNumber: "Vehicle registration number",
  vehicleType: "Vehicle type",
  makeModel: "Make and model",
  capacityKg: "Capacity (kg)",
  trailerNumber: "Trailer number (if applicable)",
  insuranceNumber: "Insurance policy number",
  insuranceExpiresOn: "Insurance expiry",
  vehiclePermitNumber: "Vehicle permit number",
  vehiclePermitExpiresOn: "Vehicle permit expiry",
};

function initialRegistration(account: LinkedAccountProfile): Registration {
  const saved = account.onboarding?.form_data ?? {};
  const fields = Object.keys(labels) as (keyof Registration)[];
  const registration = Object.fromEntries(
    fields.map((field) => [field, typeof saved[field] === "string" ? saved[field] : ""]),
  ) as Registration;
  return {
    ...registration,
    fullName: registration.fullName || account.profile.displayName,
    phone: account.profile.phone ?? "",
  };
}

function initialStep(account: LinkedAccountProfile): Step {
  const savedStep = account.onboarding?.current_step;
  return steps.includes(savedStep as Step) ? (savedStep as Step) : "transporter";
}

export function DriverOnboarding({
  account,
  onComplete,
  onLater,
}: {
  account: LinkedAccountProfile;
  onComplete: (account: LinkedAccountProfile, warning?: string) => void;
  onLater: () => void;
}) {
  const [registration, setRegistration] = useState(() => initialRegistration(account));
  const [step, setStep] = useState<Step>(() => initialStep(account));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof Registration, value: string) =>
    setRegistration((current) => ({ ...current, [field]: value }));

  const currentFields =
    step === "transporter"
      ? driverRegistrationFields.slice(0, 7)
      : step === "driver"
        ? driverRegistrationFields.slice(7, 13)
        : [...driverRegistrationFields.slice(13), "trailerNumber" as const];

  const continueStep = async () => {
    setBusy(true);
    setError("");
    try {
      if (step === "transporter") {
        await saveAccountOnboarding({ currentStep: "driver", formData: registration });
        setStep("driver");
      } else if (step === "driver") {
        await saveAccountOnboarding({ currentStep: "vehicle", formData: registration });
        setStep("vehicle");
      } else {
        await saveAccountOnboarding({ currentStep: "vehicle", formData: registration });
        const result = await completeDriverOnboarding(registration);
        const profile = await refreshAccountProfile();
        if (profile.status !== "linked") {
          throw new Error("Your completed profile could not be loaded.");
        }
        onComplete(profile, result.warning);
      }
    } catch (stepError) {
      setError(stepError instanceof Error ? stepError.message : "Your details could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const title =
    step === "transporter"
      ? "Transporter details"
      : step === "driver"
        ? "Driver details"
        : "Vehicle details";

  return (
    <section className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <p className="text-sm font-semibold text-primary">Driver/Transporter profile</p>
      <h1 className="mt-1 text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Step {steps.indexOf(step) + 1} of {steps.length}. Your progress is saved as you continue.
      </p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void continueStep();
        }}
      >
        {currentFields.map((field) => {
          const type = field.endsWith("ExpiresOn")
            ? "date"
            : field === "capacityKg"
              ? "number"
              : "text";
          const isPhone = field === "phone" || field === "transporterPhone";
          return (
            <label key={field} className="block space-y-1.5">
              <span className="text-sm font-medium">{labels[field]}</span>
              <Input
                type={type}
                inputMode={isPhone ? "tel" : field === "capacityKg" ? "decimal" : undefined}
                autoComplete={isPhone ? "tel" : undefined}
                min={field === "capacityKg" ? "1" : undefined}
                step={field === "capacityKg" ? "1" : undefined}
                value={registration[field]}
                onChange={(event) => update(field, event.target.value)}
                required={field !== "trailerNumber"}
                readOnly={field === "phone"}
              />
            </label>
          );
        })}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
          {busy ? "Saving..." : step === "vehicle" ? "Finish profile" : "Continue"}
        </Button>
        <Button type="button" variant="ghost" className="w-full" onClick={onLater}>
          Complete later
        </Button>
      </form>
    </section>
  );
}
