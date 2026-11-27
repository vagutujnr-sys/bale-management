import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import {
  requestPwaInstall,
  startPwaInstallBridge,
  type PwaInstallPromptEvent,
} from "@/lib/pwa-install";

describe("PWA install handoff", () => {
  let stopBridge: (() => void) | undefined;

  beforeEach(() => {
    window.history.replaceState({}, "", "/farmer?tankisol_install=1");
    stopBridge = startPwaInstallBridge();
  });

  afterEach(() => {
    stopBridge?.();
    stopBridge = undefined;
    window.history.replaceState({}, "", "/");
    vi.restoreAllMocks();
  });

  it("prompts on the first click after a store handoff", () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    const installEvent = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
      prompt,
      userChoice: Promise.resolve({ outcome: "accepted" as const }),
    }) as PwaInstallPromptEvent;

    window.dispatchEvent(installEvent);
    window.dispatchEvent(new MouseEvent("click"));

    expect(installEvent.defaultPrevented).toBe(true);
    expect(prompt).toHaveBeenCalledOnce();
    expect(window.location.search).toBe("");
  });

  it("shows browser guidance when the install prompt is unavailable", () => {
    const showGuidance = vi.spyOn(toast, "info");

    window.dispatchEvent(new MouseEvent("click"));

    expect(showGuidance).toHaveBeenCalledOnce();
    expect(window.location.search).toBe("");
  });

  it("does not consume the same prompt again after a manual install request", async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    window.dispatchEvent(
      Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
        prompt,
        userChoice: Promise.resolve({ outcome: "accepted" as const }),
      }),
    );

    await requestPwaInstall();
    window.dispatchEvent(new MouseEvent("click"));

    expect(prompt).toHaveBeenCalledOnce();
  });
});
