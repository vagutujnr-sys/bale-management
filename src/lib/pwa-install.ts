import { toast } from "sonner";

export type PwaInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallPromptListener = (available: boolean) => void;

let deferredPrompt: PwaInstallPromptEvent | null = null;
let handoffPending = false;
let bridgeStarted = false;
const listeners = new Set<InstallPromptListener>();

function notifyPromptListeners() {
  for (const listener of listeners) listener(deferredPrompt !== null);
}

function removeHandoffQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("tankisol_install");
  window.history.replaceState(window.history.state, "", url);
}

export function subscribeToPwaInstallPrompt(listener: InstallPromptListener) {
  listeners.add(listener);
  listener(deferredPrompt !== null);
  return () => listeners.delete(listener);
}

export async function requestPwaInstall() {
  const prompt = deferredPrompt;
  if (!prompt) return null;

  deferredPrompt = null;
  handoffPending = false;
  notifyPromptListeners();
  removeHandoffQuery();

  await prompt.prompt();
  return (await prompt.userChoice).outcome;
}

export function startPwaInstallBridge() {
  if (typeof window === "undefined" || bridgeStarted) return () => {};
  bridgeStarted = true;
  handoffPending = new URLSearchParams(window.location.search).get("tankisol_install") === "1";

  const captureInstallPrompt = (event: Event) => {
    event.preventDefault();
    deferredPrompt = event as PwaInstallPromptEvent;
    notifyPromptListeners();
  };
  const handoffOnClick = (event: MouseEvent) => {
    if (!handoffPending) return;
    if (event.target instanceof Element && event.target.closest("[data-pwa-install-button]")) {
      handoffPending = false;
      removeHandoffQuery();
      return;
    }

    if (!deferredPrompt) {
      handoffPending = false;
      removeHandoffQuery();
      const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
      toast.info(
        isAppleMobile
          ? "In Safari, tap Share, then Add to Home Screen."
          : "Open your browser menu and choose Install app or Add to Home screen.",
      );
      return;
    }

    void requestPwaInstall().catch((error: unknown) => {
      console.error("Could not open the app installation prompt.", error);
      toast.error("Could not open the app installation prompt. Please try your browser menu.");
    });
  };

  window.addEventListener("beforeinstallprompt", captureInstallPrompt);
  if (handoffPending) window.addEventListener("click", handoffOnClick);

  return () => {
    window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
    window.removeEventListener("click", handoffOnClick);
    deferredPrompt = null;
    handoffPending = false;
    bridgeStarted = false;
    notifyPromptListeners();
  };
}
