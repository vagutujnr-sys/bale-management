import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { pwaApps, pwaLinks } from "@/lib/pwa";

const appKeys = Object.keys(pwaApps) as (keyof typeof pwaApps)[];

describe("Installable application manifests", () => {
  it("provides a distinct manifest for every app", () => {
    expect(appKeys).toHaveLength(10);
    const ids = appKeys.map(
      (app) =>
        JSON.parse(readFileSync(resolve(process.cwd(), `public/pwa/${app}.webmanifest`), "utf8"))
          .id,
    );
    expect(new Set(ids).size).toBe(10);
  });

  it.each(appKeys)("makes %s open its own screen in standalone mode", (app) => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), `public/pwa/${app}.webmanifest`), "utf8"),
    );
    expect(manifest.id).toBe(`/${app}`);
    expect(manifest.start_url).toBe(`/${app}`);
    expect(manifest.display).toBe("standalone");
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: "192x192", purpose: "any" }),
        expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
      ]),
    );
    expect(pwaLinks(app)[0]).toEqual({ rel: "manifest", href: `/pwa/${app}.webmanifest` });
  });

  it("uses a distinct custom icon for every app at each install size", () => {
    for (const size of [180, 192, 512]) {
      const icons = appKeys.map((app) =>
        readFileSync(resolve(process.cwd(), `public/pwa/${app}-${size}.png`)),
      );
      expect(new Set(icons.map((icon) => icon.toString("base64"))).size).toBe(appKeys.length);
    }
  });
});
