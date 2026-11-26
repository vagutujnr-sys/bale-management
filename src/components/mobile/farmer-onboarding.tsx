import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  completeFarmerOnboarding,
  refreshAccountProfile,
  saveAccountFarm,
  saveAccountOnboarding,
  type AccountFarm,
  type LinkedAccountProfile,
} from "@/lib/account-auth";
import type { FarmerProfileDraft } from "@/lib/farmer-profile";

const steps = ["identity", "farm", "contact"] as const;
type Step = (typeof steps)[number];

const labels: Partial<Record<keyof FarmerProfileDraft, string>> = {
  growerNumber: "Grower number",
  nationalId: "National ID",
  firstName: "First name",
  surname: "Surname",
  farmName: "Farm name",
  province: "Province",
  district: "District",
  ward: "Ward",
  alternatePhone: "Alternative mobile number",
  contractingCompany: "Contracting company",
};

function savedString(data: Record<string, unknown>, key: keyof FarmerProfileDraft) {
  return typeof data[key] === "string" ? (data[key] as string) : "";
}

function initialDraft(account: LinkedAccountProfile): FarmerProfileDraft {
  const saved = account.onboarding?.form_data ?? {};
  const names = account.profile.displayName.trim().split(/\s+/);
  const primaryFarm = account.farms?.find((farm) => farm.is_primary) ?? account.farms?.[0];
  return {
    growerNumber: savedString(saved, "growerNumber"),
    nationalId: savedString(saved, "nationalId"),
    firstName: savedString(saved, "firstName") || names[0] || "",
    surname: savedString(saved, "surname") || names.slice(1).join(" "),
    farmName: savedString(saved, "farmName") || primaryFarm?.farm_name || "",
    province: savedString(saved, "province") || primaryFarm?.province || "",
    district: savedString(saved, "district") || primaryFarm?.district || "",
    ward: savedString(saved, "ward") || primaryFarm?.ward || "",
    phone: account.profile.phone ?? account.farmer?.phone ?? "",
    alternatePhone: savedString(saved, "alternatePhone"),
    contractingCompany: savedString(saved, "contractingCompany"),
  };
}

function initialStep(account: LinkedAccountProfile): Step {
  const savedStep = account.onboarding?.current_step;
  return steps.includes(savedStep as Step) ? (savedStep as Step) : "identity";
}

export function FarmerOnboarding({
  account,
  onComplete,
  onLater,
}: {
  account: LinkedAccountProfile;
  onComplete: (account: LinkedAccountProfile) => void;
  onLater: (farms: AccountFarm[]) => void;
}) {
  const [draft, setDraft] = useState(() => initialDraft(account));
  const [step, setStep] = useState<Step>(() => initialStep(account));
  const [primaryFarm, setPrimaryFarm] = useState(
    () => account.farms?.find((farm) => farm.is_primary) ?? account.farms?.[0] ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (field: keyof FarmerProfileDraft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const continueStep = async () => {
    setBusy(true);
    setError("");
    try {
      if (step === "identity") {
        await saveAccountOnboarding({ currentStep: "farm", formData: draft });
        setStep("farm");
      } else if (step === "farm") {
        const farmResult = await saveAccountFarm({
          ...(primaryFarm ? { id: primaryFarm.id } : {}),
          farmName: draft.farmName,
          province: draft.province,
          district: draft.district,
          ward: draft.ward,
          isPrimary: true,
        });
        setPrimaryFarm(farmResult.farm);
        await saveAccountOnboarding({ currentStep: "contact", formData: draft });
        setStep("contact");
      } else {
        await saveAccountOnboarding({ currentStep: "contact", formData: draft });
        await completeFarmerOnboarding(draft);
        const result = await refreshAccountProfile();
        if (result.status !== "linked")
          throw new Error("Your completed profile could not be loaded.");
        onComplete(result);
      }
    } catch (stepError) {
      setError(stepError instanceof Error ? stepError.message : "Your details could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const fields: (keyof FarmerProfileDraft)[] =
    step === "identity"
      ? ["firstName", "surname", "growerNumber", "nationalId"]
      : step === "farm"
        ? ["farmName", "province", "district", "ward"]
        : ["alternatePhone", "contractingCompany"];

  return (
    <section className="flex flex-1 flex-col px-5 pb-8 pt-6">
      <p className="text-sm font-semibold text-primary">Farmer profile</p>
      <h1 className="mt-1 text-2xl font-bold">
        {step === "identity" ? "Your details" : step === "farm" ? "Your farm" : "Contact details"}
      </h1>
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
        {fields.map((field) => (
          <label key={field} className="block space-y-1.5">
            <span className="text-sm font-medium">{labels[field]}</span>
            <Input
              type={field === "alternatePhone" ? "tel" : "text"}
              autoComplete={field === "alternatePhone" ? "tel" : undefined}
              value={draft[field]}
              onChange={(event) => update(field, event.target.value)}
              required
            />
          </label>
        ))}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
          {busy ? "Saving..." : step === "contact" ? "Finish profile" : "Continue"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() =>
            onLater(
              primaryFarm
                ? [
                    primaryFarm,
                    ...(account.farms ?? []).filter((farm) => farm.id !== primaryFarm.id),
                  ]
                : (account.farms ?? []),
            )
          }
        >
          Complete later
        </Button>
      </form>
    </section>
  );
}
