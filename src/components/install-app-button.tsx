import { Check, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-context";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton({ appName }: { appName: string }) {
  const { t } = useLanguage();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const checkInstalled = () => {
      const iosStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setInstalled(displayMode.matches || iosStandalone);
    };
    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
      setMessage("");
    };
    const installedListener = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setMessage(t("{appName} is installed and ready to open.", { appName }));
    };

    checkInstalled();
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", installedListener);
    displayMode.addEventListener("change", checkInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", installedListener);
      displayMode.removeEventListener("change", checkInstalled);
    };
  }, [appName, t]);

  const install = async () => {
    if (!installPrompt) {
      const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      setMessage(
        isAppleMobile
          ? t("In Safari, tap Share, then Add to Home Screen.")
          : t("Open your browser menu and choose Install app or Add to Home screen."),
      );
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    setMessage(
      t(
        outcome === "accepted"
          ? "Installation accepted. Your app is being added."
          : "Installation cancelled. You can try again anytime.",
      ),
    );
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
