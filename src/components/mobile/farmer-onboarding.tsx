import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LanguageSelector } from "@/components/mobile/language-selector";
import {
  completeFarmerOnboarding,
  refreshAccountProfile,
  saveAccountOnboarding,
  submitAccountFarmForAssessment,
  type AccountFarm,
  type LinkedAccountProfile,
} from "@/lib/account-auth";
import type { FarmerProfileDraft } from "@/lib/farmer-profile";
import { useLanguage } from "@/lib/language-context";

const steps = ["identity", "farm", "contact"] as const;
type Step = (typeof steps)[number];
type OnboardingDraft = FarmerProfileDraft & {
  farmSizeHa: string;
  expectedProductionKg: string;
};

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

function savedString(data: Record<string, unknown>, key: string) {
  return typeof data[key] === "string" ? (data[key] as string) : "";
}

function initialDraft(account: LinkedAccountProfile): OnboardingDraft {
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
    farmSizeHa:
      savedString(saved, "farmSizeHa") ||
      (primaryFarm?.farm_size_ha == null ? "" : String(primaryFarm.farm_size_ha)),
    expectedProductionKg:
      savedString(saved, "expectedProductionKg") ||
      (primaryFarm?.expected_production_kg == null
        ? ""
        : String(primaryFarm.expected_production_kg)),
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
  const { t } = useLanguage();
  const [draft, setDraft] = useState(() => initialDraft(account));
  const [step, setStep] = useState<Step>(() => initialStep(account));
  const [primaryFarm, setPrimaryFarm] = useState(
    () => account.farms?.find((farm) => farm.is_primary) ?? account.farms?.[0] ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [farmPhotos, setFarmPhotos] = useState<File[]>([]);

  const update = (field: keyof OnboardingDraft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));

  const continueStep = async () => {
    setBusy(true);
    setError("");
    try {
      if (step === "identity") {
        await saveAccountOnboarding({ currentStep: "farm", formData: draft });
        setStep("farm");
      } else if (step === "farm") {
        const farmResult = await submitAccountFarmForAssessment(
          {
            ...(primaryFarm ? { id: primaryFarm.id } : {}),
            farmName: draft.farmName,
            province: draft.province,
            district: draft.district,
            ward: draft.ward,
            farmSizeHa: Number(draft.farmSizeHa),
            expectedProductionKg: Number(draft.expectedProductionKg),
            isPrimary: true,
          },
          farmPhotos,
        );
        setPrimaryFarm(farmResult.farm);
        setFarmPhotos([]);
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
      setError(
        t(stepError instanceof Error ? stepError.message : "Your details could not be saved."),
      );
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
      <div className="mb-3 flex justify-end">
        <LanguageSelector />
      </div>
      <p className="text-sm font-semibold text-primary">{t("Farmer profile")}</p>
      <h1 className="mt-1 text-2xl font-bold">
        {t(
          step === "identity" ? "Your details" : step === "farm" ? "Your farm" : "Contact details",
        )}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("Step {step} of {total}. Your progress is saved as you continue.", {
          step: steps.indexOf(step) + 1,
          total: steps.length,
        })}
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
            <span className="text-sm font-medium">{t(labels[field] ?? "")}</span>
            <Input
              type={field === "alternatePhone" ? "tel" : "text"}
              autoComplete={field === "alternatePhone" ? "tel" : undefined}
              value={draft[field]}
              onChange={(event) => update(field, event.target.value)}
              required
            />
          </label>
        ))}
        {step === "farm" && (
          <>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("Farm size (hectares)")}</span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={draft.farmSizeHa}
                onChange={(event) => update("farmSizeHa", event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">
                {t("Expected production (kg per season)")}
              </span>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={draft.expectedProductionKg}
                onChange={(event) => update("expectedProductionKg", event.target.value)}
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium">{t("Farm photos (at least 4)")}</span>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setFarmPhotos(Array.from(event.target.files ?? []))}
                aria-describedby="farm-photo-help"
              />
              <span id="farm-photo-help" className="block text-xs text-muted-foreground">
                {t(
                  "Upload at least 4 clear JPEG, PNG or WebP photos. Maximum 10 photos, 8 MB each.",
                )}
              </span>
              {(farmPhotos.length > 0 || (primaryFarm?.photo_paths?.length ?? 0) > 0) && (
                <span className="block text-xs text-muted-foreground">
                  {t("{count} new photos selected; {saved} already saved.", {
                    count: farmPhotos.length,
                    saved: primaryFarm?.photo_paths?.length ?? 0,
                  })}
                </span>
              )}
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full rounded-xl" disabled={busy}>
          {busy ? t("Saving...") : step === "contact" ? t("Finish profile") : t("Continue")}
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
          {t("Complete later")}
        </Button>
      </form>
    </section>
  );
}
