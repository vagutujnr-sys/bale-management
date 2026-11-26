import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileDeviceGate } from "@/components/mobile/shell";
import { isMobileDevice } from "@/hooks/use-mobile";

describe("mobile device detection", () => {
  it.each([
    ["iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", 0],
    ["Android", "Mozilla/5.0 (Linux; Android 15; Pixel 9)", 0],
    ["iPadOS", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 5],
  ])("recognizes %s devices", (_name, userAgent, maxTouchPoints) => {
    expect(isMobileDevice(userAgent, maxTouchPoints)).toBe(true);
  });

  it("rejects desktop devices", () => {
    expect(isMobileDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
    expect(isMobileDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", 0)).toBe(false);
  });

  it("shows only the mobile-reservation notice on desktop", async () => {
    render(
      <MobileDeviceGate>
        <p>App login</p>
      </MobileDeviceGate>,
    );

    expect(
      await screen.findByText("Reserved for mobile. Access this portal using your mobile device."),
    ).toBeVisible();
    expect(screen.queryByText("App login")).not.toBeInTheDocument();
  });
});
