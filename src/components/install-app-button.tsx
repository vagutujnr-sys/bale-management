import { Check, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton({ appName }: { appName: string }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const checkInstalled = () => {
      const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
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
      setMessage(`${appName} is installed and ready to open.`);
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
  }, [appName]);

  const install = async () => {
    if (!installPrompt) {
      const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      setMessage(
        isAppleMobile
          ? "In Safari, tap Share, then Add to Home Screen."
          : "Open your browser menu and choose Install app or Add to Home screen.",
      );
      return;
    }

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    setInstallPrompt(null);
    setMessage(outcome === "accepted" ? "Installation accepted. Your app is being added." : "Installation cancelled. You can try again anytime.");
  };

  if (installed) {
    return <p role="status" className="flex items-center justify-center gap-2 text-center text-xs font-medium text-primary"><Check className="h-4 w-4" /> {appName} is installed.</p>;
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="lg" className="w-full rounded-xl" onClick={install}>
        <Download /> Install app
      </Button>
      {message && <p role="status" className="text-center text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
