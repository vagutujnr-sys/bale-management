import { Check, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";
import { requestPwaInstall, subscribeToPwaInstallPrompt } from "@/lib/pwa-install";

export function InstallAppButton({ appName }: { appName: string }) {
  const { t } = useLanguage();
  const [installPromptAvailable, setInstallPromptAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const checkInstalled = () => {
      const iosStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(displayMode.matches || iosStandalone);
    };
    const installedListener = () => {
      setInstalled(true);
      setInstallPromptAvailable(false);
      setMessage(t("{appName} is installed and ready to open.", { appName }));
    };

    checkInstalled();
    const unsubscribe = subscribeToPwaInstallPrompt(setInstallPromptAvailable);
    window.addEventListener("appinstalled", installedListener);
    displayMode.addEventListener("change", checkInstalled);
    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", installedListener);
      displayMode.removeEventListener("change", checkInstalled);
    };
  }, [appName, t]);

  const install = async () => {
    if (!installPromptAvailable) {
      const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      setMessage(
        isAppleMobile
          ? t("In Safari, tap Share, then Add to Home Screen.")
          : t("Open your browser menu and choose Install app or Add to Home screen."),
      );
      return;
    }

    try {
      const outcome = await requestPwaInstall();
      setMessage(
        t(
          outcome === "accepted"
            ? "Installation accepted. Your app is being added."
            : outcome === "dismissed"
              ? "Installation cancelled. You can try again anytime."
              : "Open your browser menu and choose Install app or Add to Home screen.",
        ),
      );
    } catch (error) {
      console.error("Could not install the app.", error);
      setMessage(t("Installation failed. Please try again from your browser menu."));
    }
  };

  if (installed) {
    return (
      <p
        role="status"
        className="flex items-center justify-center gap-2 text-center text-xs font-medium text-primary"
      >
        <Check className="h-4 w-4" /> {t("{appName} is installed.", { appName })}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        data-pwa-install-button
        type="button"
        variant="outline"
        size="lg"
        className="w-full rounded-xl"
        onClick={install}
      >
        <Download /> {t("Install app")}
      </Button>
      {message && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
