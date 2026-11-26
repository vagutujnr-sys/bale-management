import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { LogOut } from "lucide-react";
import appIcon from "@/assets/leaf-appicon.png";
import { InstallAppButton } from "@/components/install-app-button";
import { MobileAccountAccess } from "@/components/mobile/account-access";
import { DriverOnboarding } from "@/components/mobile/driver-onboarding";
import { DeviceFrame, MobileDeviceGate } from "@/components/mobile/shell";
import { LanguageSelector } from "@/components/mobile/language-selector";
import { Button } from "@/components/ui/button";
import { pwaLinks, pwaMeta } from "@/lib/pwa";
import type { AccountSignInResult, LinkedAccountProfile } from "@/lib/account-auth";
import { getSupabaseClient } from "@/lib/supabase";
import { LanguageProvider } from "@/lib/language";
import { useLanguage } from "@/lib/language-context";

export const Route = createFileRoute("/driver")({
  head: () => ({
    meta: [
      ...pwaMeta("driver"),
      { title: "Driver/Transporter App — Bale Contract System" },
      {
        name: "description",
        content: "Register your vehicle and driver details for tobacco transport.",
      },
    ],
    links: pwaLinks("driver"),
  }),
  component: DriverApp,
});

function DriverApp() {
  return (
    <LanguageProvider>
      <DriverAppContent />
    </LanguageProvider>
  );
}

function DriverAppContent() {
  const [account, setAccount] = useState<LinkedAccountProfile | null>(null);
  const [warning, setWarning] = useState("");
  const [deferred, setDeferred] = useState(false);
  const { t } = useLanguage();

  const onAuthenticated = (result: AccountSignInResult) => {
    if (result.status === "linked") {
      setAccount(result);
      setDeferred(false);
    }
  };

  return (
    <MobileDeviceGate>
      <DeviceFrame>
        {account ? (
          account.driver ? (
            <main className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-6">
              <div className="mb-3 flex justify-end">
                <LanguageSelector />
              </div>
              <section className="space-y-4">
                <h1 className="text-2xl font-bold">{t("Driver/Transporter App")}</h1>
                <p className="text-lg font-semibold">
                  {t("Welcome, {name}", { name: account.profile.displayName })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("Driver licence:")} {account.driver.licence_number}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("Transporter ID:")} {account.driver.transporter_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t("Status")}: {t(account.driver.status)}
                </p>
                {warning && (
                  <p role="status" className="text-sm text-amber-700">
                    {warning}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void getSupabaseClient()?.auth.signOut();
                    setAccount(null);
                    setWarning("");
                    setDeferred(false);
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("Sign out")}
                </Button>
              </section>
            </main>
          ) : deferred ? (
            <main className="no-scrollbar flex-1 overflow-y-auto">
              <section className="space-y-4 px-5 pt-6">
                <div className="flex justify-end">
                  <LanguageSelector />
                </div>
                <h1 className="text-2xl font-bold">{t("Profile setup saved")}</h1>
                <p className="text-sm text-muted-foreground">
                  {t("Continue when you are ready. Your details are saved on this account.")}
                </p>
                <Button type="button" className="w-full" onClick={() => setDeferred(false)}>
                  {t("Continue setup")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    void getSupabaseClient()?.auth.signOut();
                    setAccount(null);
                    setWarning("");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {t("Sign out")}
                </Button>
              </section>
            </main>
          ) : (
            <main className="no-scrollbar flex-1 overflow-y-auto">
              <DriverOnboarding
                account={account}
                onComplete={(completedAccount, completionWarning) => {
                  setAccount(completedAccount);
                  setWarning(completionWarning ?? "");
                }}
                onLater={() => setDeferred(true)}
              />
              <Button
                type="button"
                variant="ghost"
                className="mx-5 mb-4"
                onClick={() => {
                  void getSupabaseClient()?.auth.signOut();
                  setAccount(null);
                  setWarning("");
                  setDeferred(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("Sign out")}
              </Button>
            </main>
          )
        ) : (
          <MobileAccountAccess
            title="Driver/Transporter App"
            accountKind="driver"
            onAuthenticated={onAuthenticated}
          />
        )}
        <div className="mx-5 mb-5 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <img src={appIcon} alt="" className="h-10 w-10 object-contain" />
            <div>
              <p className="font-semibold">{t("Driver/Transporter App")}</p>
              <p className="text-xs text-muted-foreground">{t("Install for quick access")}</p>
            </div>
          </div>
          <div className="mt-4">
            <InstallAppButton appName="Driver/Transporter App" />
          </div>
        </div>
      </DeviceFrame>
    </MobileDeviceGate>
  );
}
