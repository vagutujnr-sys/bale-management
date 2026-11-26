import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { defaultRoleApplications, staffApplications } from "@/data/ops";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it.each([
    "/",
    "/about",
    "/farmer",
    "/driver",
    "/contracting",
    "/gate",
    "/transport",
    "/quality",
    "/finance",
    "/warehouse",
    "/admin",
    "/workstation",
  ])("matches a real page for %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes(path);

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("keeps the farmer app separate from role-shared staff applications", () => {
    expect(staffApplications.some((app) => app.route === "/farmer")).toBe(false);
    expect(defaultRoleApplications["System Administrator"]).toHaveLength(staffApplications.length);
    expect(defaultRoleApplications["Contracting Officer"]).toEqual(["contracting"]);
  });
});
