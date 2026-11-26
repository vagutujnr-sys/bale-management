import { afterEach, describe, expect, it, vi } from "vitest";
import { handleAuthApiRequest } from "../server/auth-api";

const config = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-server-key",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("server auth API", () => {
  it("rejects incomplete farmer registrations before any database request", async () => {
    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/farmer-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      config,
    );

    expect(response?.status).toBe(400);
  });

  it("rejects incomplete driver registrations before any database request", async () => {
    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/driver-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      config,
    );

    expect(response?.status).toBe(400);
  });

  it("rejects impossible driver-document dates before any database request", async () => {
    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/driver-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transporterName: "Example Transport",
          transporterRegistrationNumber: "TR-1",
          transporterContactPerson: "Example Contact",
          transporterPhone: "+263771234567",
          transporterAddress: "Harare",
          transporterPermitNumber: "TP-1",
          transporterPermitExpiresOn: "2026-99-99",
          fullName: "Example Driver",
          nationalId: "ID-1",
          phone: "+263771234568",
          licenceNumber: "DL-1",
          licenceClass: "Class 2",
          licenceExpiresOn: "2027-01-01",
          vehicleRegistrationNumber: "AEZ 1234",
          vehicleType: "Truck",
          makeModel: "Example Model",
          capacityKg: "10000",
          trailerNumber: "",
          insuranceNumber: "INS-1",
          insuranceExpiresOn: "2027-01-01",
          vehiclePermitNumber: "VP-1",
          vehiclePermitExpiresOn: "2027-01-01",
          pin: "123456",
        }),
      }),
      config,
    );

    expect(response?.status).toBe(400);
  });

  it("requires a bearer token before looking up an account profile", async () => {
    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/profile"),
      config,
    );

    expect(response?.status).toBe(401);
  });

  it("requires a bearer token before loading farmer records", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/farmer-dashboard"),
      config,
    );

    expect(response?.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an empty farmer dashboard without querying records for an incomplete account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname === "/auth/v1/user") {
          return Response.json({ id: "11111111-1111-4111-8111-111111111111" });
        }
        if (url.pathname === "/rest/v1/profiles") {
          return Response.json([
            {
              user_id: "11111111-1111-4111-8111-111111111111",
              display_name: "Farmer",
              role: "farmer",
              farmer_id: null,
            },
          ]);
        }
        throw new Error(`Unexpected Supabase request: ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/farmer-dashboard", {
        headers: { authorization: "Bearer valid-token" },
      }),
      config,
    );

    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toMatchObject({
      seasonSummaries: [],
      contracts: [],
      deliveries: [],
      bales: [],
      salesSheets: [],
      paymentRequests: [],
    });
  });

  it("scopes farmer dashboard and related records to the signed-in farmer", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const farmerId = "22222222-2222-4222-8222-222222222222";
    const baleId = "33333333-3333-4333-8333-333333333333";
    const salesSheetId = "44444444-4444-4444-8444-444444444444";
    const paymentRequestId = "55555555-5555-4555-8555-555555555555";
    const requestedUrls: URL[] = [];

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        requestedUrls.push(url);
        if (url.pathname === "/auth/v1/user") return Response.json({ id: userId });
        if (url.pathname === "/rest/v1/profiles") {
          return Response.json([
            { user_id: userId, display_name: "Farmer", role: "farmer", farmer_id: farmerId },
          ]);
        }

        const rows: Record<string, unknown[]> = {
          "/rest/v1/farmer_season_summary": [],
          "/rest/v1/contracts": [],
          "/rest/v1/deliveries": [],
          "/rest/v1/bales": [{ id: baleId }],
          "/rest/v1/current_bale_locations": [],
          "/rest/v1/sales_sheets": [{ id: salesSheetId }],
          "/rest/v1/payment_requests": [{ id: paymentRequestId }],
          "/rest/v1/quality_inspections": [],
          "/rest/v1/bale_prices": [],
          "/rest/v1/sales_sheet_items": [],
          "/rest/v1/sales_sheet_adjustments": [],
          "/rest/v1/payment_transactions": [],
        };
        const result = rows[url.pathname];
        if (!result) throw new Error(`Unexpected Supabase request: ${url.pathname}`);
        return Response.json(result);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/farmer-dashboard", {
        headers: { authorization: "Bearer valid-token" },
      }),
      config,
    );

    expect(response?.status).toBe(200);
    const dashboard = await response?.json();
    expect(dashboard).toMatchObject({
      bales: [{ id: baleId }],
      salesSheets: [{ id: salesSheetId }],
      paymentRequests: [{ id: paymentRequestId }],
    });
    const farmerScopedTables = [
      "/rest/v1/farmer_season_summary",
      "/rest/v1/contracts",
      "/rest/v1/deliveries",
      "/rest/v1/bales",
      "/rest/v1/current_bale_locations",
      "/rest/v1/sales_sheets",
      "/rest/v1/payment_requests",
    ];
    for (const table of farmerScopedTables) {
      const requestUrl = requestedUrls.find((url) => url.pathname === table);
      expect(requestUrl?.searchParams.get("farmer_id")).toBe(`eq.${farmerId}`);
    }
    expect(
      requestedUrls
        .find((url) => url.pathname === "/rest/v1/quality_inspections")
        ?.searchParams.get("bale_id"),
    ).toBe(`in.(${baleId})`);
    expect(
      requestedUrls
        .find((url) => url.pathname === "/rest/v1/sales_sheet_items")
        ?.searchParams.get("sales_sheet_id"),
    ).toBe(`in.(${salesSheetId})`);
    expect(
      requestedUrls
        .find((url) => url.pathname === "/rest/v1/payment_transactions")
        ?.searchParams.get("payment_request_id"),
    ).toBe(`in.(${paymentRequestId})`);
  });

  it("reports whether a normalized phone number has an account", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        if (url.pathname === "/rest/v1/profiles") {
          expect(url.searchParams.get("phone_e164")).toBe("eq.+263771234567");
          return Response.json([{ user_id: "11111111-1111-4111-8111-111111111111" }]);
        }
        throw new Error(`Unexpected Supabase request: ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/account-status", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: "0771234567" }),
      }),
      config,
    );

    await expect(response?.json()).resolves.toEqual({ exists: true });
  });

  it("logs only the Supabase error code when a new account profile insert fails", async () => {
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (url.pathname === "/rest/v1/profiles" && method === "GET") {
          return Response.json([]);
        }
        if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
          return Response.json({ id: "11111111-1111-4111-8111-111111111111" }, { status: 201 });
        }
        if (url.pathname === "/rest/v1/profiles" && method === "POST") {
          return Response.json(
            { code: "42703", message: "private database details" },
            { status: 400 },
          );
        }
        if (url.pathname === "/auth/v1/admin/users/11111111-1111-4111-8111-111111111111") {
          return new Response(null, { status: 204 });
        }
        throw new Error(`Unexpected Supabase request: ${method} ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/account-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: "+263771234567",
          pin: "123456",
          displayName: "Example Farmer",
          accountKind: "farmer",
        }),
      }),
      config,
    );

    expect(response?.status).toBe(502);
    await expect(response?.json()).resolves.toEqual({
      error: "Your account profile could not be created. Please try again.",
    });
    expect(logError).toHaveBeenCalledWith("Supabase account profile insert failed.", {
      status: 400,
      code: "42703",
    });
    expect(JSON.stringify(logError.mock.calls)).not.toContain("private database details");
  });

  it("upserts the profile created by the auth-user trigger", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    let authTriggerCreatedProfile = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (url.pathname === "/rest/v1/profiles" && method === "GET") {
          return Response.json([]);
        }
        if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
          authTriggerCreatedProfile = true;
          return Response.json({ id: userId }, { status: 201 });
        }
        if (url.pathname === "/rest/v1/profiles" && method === "POST") {
          expect(authTriggerCreatedProfile).toBe(true);
          expect(url.searchParams.get("on_conflict")).toBe("user_id");
          expect(new Headers(init?.headers).get("Prefer")).toBe(
            "resolution=merge-duplicates,return=minimal",
          );
          expect(JSON.parse(String(init?.body))).toMatchObject({
            user_id: userId,
            display_name: "Example Farmer",
            role: "farmer",
            farmer_id: null,
            phone_e164: "+263771234567",
          });
          return new Response(null, { status: 204 });
        }
        if (url.pathname === "/rest/v1/account_onboarding" && method === "POST") {
          return new Response(null, { status: 201 });
        }
        throw new Error(`Unexpected Supabase request: ${method} ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/account-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: "+263771234567",
          pin: "123456",
          displayName: "Example Farmer",
          accountKind: "farmer",
        }),
      }),
      config,
    );

    expect(response?.status).toBe(201);
    await expect(response?.json()).resolves.toEqual({ created: true });
  });

  it("returns the inserted farm row when saving a new farm", async () => {
    const userId = "77777777-7777-4777-8777-777777777777";
    const farmId = "88888888-8888-4888-8888-888888888888";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (url.pathname === "/auth/v1/user") {
          return Response.json({ id: userId, email: "263771234567@phone.auth.invalid" });
        }
        if (url.pathname === "/rest/v1/profiles" && method === "GET") {
          return Response.json([
            {
              user_id: userId,
              display_name: "Example Farmer",
              role: "farmer",
              farmer_id: null,
            },
          ]);
        }
        if (url.pathname === "/rest/v1/farms" && method === "GET") return Response.json([]);
        if (url.pathname === "/rest/v1/farms" && method === "POST") {
          const farm = {
            id: farmId,
            profile_user_id: userId,
            farmer_id: null,
            farm_name: "North Farm",
            province: "Harare",
            district: "Harare",
            ward: "1",
            is_primary: true,
          };
          return Response.json([farm], { status: 201 });
        }
        throw new Error(`Unexpected Supabase request: ${method} ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/farms", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer session-token",
        },
        body: JSON.stringify({
          farmName: "North Farm",
          province: "Harare",
          district: "Harare",
          ward: "1",
        }),
      }),
      config,
    );

    await expect(response?.json()).resolves.toMatchObject({
      farm: { id: farmId, farm_name: "North Farm", is_primary: true },
    });
  });

  it("completes a farmer profile and links the primary farm to its account", async () => {
    const userId = "99999999-9999-4999-8999-999999999999";
    const farmerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (url.pathname === "/auth/v1/user") {
          return Response.json({ id: userId, email: "263771234567@phone.auth.invalid" });
        }
        if (url.pathname === "/rest/v1/profiles" && method === "GET") {
          return Response.json([
            {
              user_id: userId,
              display_name: "Example Farmer",
              role: "farmer",
              farmer_id: null,
            },
          ]);
        }
        if (url.pathname === "/rest/v1/farmers" && method === "GET") return Response.json([]);
        if (url.pathname === "/rest/v1/farmers" && method === "POST") {
          const farmer = JSON.parse(String(init?.body)) as Record<string, unknown>;
          return Response.json([{ ...farmer, id: farmerId }], { status: 201 });
        }
        if (url.pathname === "/rest/v1/farms" && method === "GET") return Response.json([]);
        if (url.pathname === "/rest/v1/farms" && method === "POST") {
          return Response.json([{ id: "farm-id" }], { status: 201 });
        }
        if (url.pathname === "/rest/v1/farms" && method === "PATCH") {
          return new Response(null, { status: 204 });
        }
        if (url.pathname === "/rest/v1/profiles" && method === "PATCH") {
          return Response.json([{ user_id: userId, farmer_id: farmerId }]);
        }
        if (url.pathname === "/rest/v1/account_onboarding" && method === "PATCH") {
          return new Response(null, { status: 204 });
        }
        throw new Error(`Unexpected Supabase request: ${method} ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/farmer-onboarding/complete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer session-token",
        },
        body: JSON.stringify({
          growerNumber: "GROWER-TEST-2",
          nationalId: "ID-TEST-2",
          firstName: "Example",
          surname: "Farmer",
          farmName: "North Farm",
          province: "Harare",
          district: "Harare",
          ward: "1",
          phone: "+263771234567",
          alternatePhone: "+263771234568",
          contractingCompany: "Example Company",
        }),
      }),
      config,
    );

    await expect(response?.json()).resolves.toMatchObject({ completed: true, farmerId });
  });

  it("creates and immediately links a new farmer without calling a staff-only RPC", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const farmerId = "22222222-2222-4222-8222-222222222222";
    const writes: { path: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
          return Response.json({ id: userId }, { status: 201 });
        }
        if (url.pathname === "/rest/v1/farmers" && method === "GET") {
          return Response.json([]);
        }
        if (url.pathname === "/rest/v1/farmers" && method === "POST") {
          const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
          writes.push({ path: url.pathname, body });
          return Response.json(
            [
              {
                ...body,
                id: farmerId,
              },
            ],
            { status: 201 },
          );
        }
        if (url.pathname === "/rest/v1/profiles" && method === "POST") {
          writes.push({
            path: url.pathname,
            body: JSON.parse(String(init?.body)) as Record<string, unknown>,
          });
          return new Response(null, { status: 201 });
        }
        throw new Error(`Unexpected Supabase request: ${method} ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/farmer-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pin: "123456",
          farmer: {
            growerNumber: "GROWER-TEST-1",
            nationalId: "ID-TEST-1",
            firstName: "Example",
            surname: "Farmer",
            farmName: "Test Farm",
            province: "Harare",
            district: "Harare",
            ward: "1",
            phone: "+263771234567",
            alternatePhone: "+263771234568",
            contractingCompany: "Example Company",
          },
        }),
      }),
      config,
    );

    expect(response?.status).toBe(201);
    await expect(response?.json()).resolves.toMatchObject({
      status: "linked",
      farmer: { id: farmerId },
    });
    expect(writes).toHaveLength(2);
    const farmerWrite = writes.find(({ path }) => path === "/rest/v1/farmers");
    const profileWrite = writes.find(({ path }) => path === "/rest/v1/profiles");
    if (!farmerWrite || !profileWrite) throw new Error("Expected farmer and profile inserts.");
    expect(farmerWrite.body).toMatchObject({ created_by: userId });
    expect(profileWrite.body).toMatchObject({
      user_id: userId,
      role: "farmer",
      farmer_id: farmerId,
    });
    expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input).includes("/rpc/"))).toBe(
      false,
    );
  });

  it("creates the transporter, driver, and vehicle before linking a new driver account", async () => {
    const userId = "33333333-3333-4333-8333-333333333333";
    const transporterId = "44444444-4444-4444-8444-444444444444";
    const driverId = "55555555-5555-4555-8555-555555555555";
    const vehicleId = "66666666-6666-4666-8666-666666666666";
    const writes: { path: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        const method = init?.method ?? "GET";
        if (url.pathname === "/auth/v1/admin/users" && method === "POST") {
          return Response.json({ id: userId }, { status: 201 });
        }
        if (url.pathname.startsWith("/rest/v1/") && method === "GET") {
          return Response.json([]);
        }
        if (
          ["/rest/v1/transporters", "/rest/v1/drivers", "/rest/v1/vehicles"].includes(
            url.pathname,
          ) &&
          method === "POST"
        ) {
          const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
          writes.push({ path: url.pathname, body });
          const id =
            url.pathname === "/rest/v1/transporters"
              ? transporterId
              : url.pathname === "/rest/v1/drivers"
                ? driverId
                : vehicleId;
          return Response.json([{ ...body, id }], { status: 201 });
        }
        if (url.pathname === "/rest/v1/profiles" && method === "POST") {
          writes.push({
            path: url.pathname,
            body: JSON.parse(String(init?.body)) as Record<string, unknown>,
          });
          return new Response(null, { status: 201 });
        }
        if (url.pathname === `/auth/v1/admin/users/${userId}` && method === "PUT") {
          return Response.json({}, { status: 200 });
        }
        throw new Error(`Unexpected Supabase request: ${method} ${url.pathname}`);
      }),
    );

    const response = await handleAuthApiRequest(
      new Request("https://app.example/api/auth/driver-signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transporterName: "Example Transport",
          transporterRegistrationNumber: "TR-TEST-1",
          transporterContactPerson: "Example Contact",
          transporterPhone: "+263771234569",
          transporterAddress: "Harare",
          transporterPermitNumber: "TP-TEST-1",
          transporterPermitExpiresOn: "2027-01-01",
          fullName: "Example Driver",
          nationalId: "ID-TEST-2",
          phone: "+263771234570",
          licenceNumber: "DL-TEST-1",
          licenceClass: "Class 2",
          licenceExpiresOn: "2027-01-01",
          vehicleRegistrationNumber: "TEST-1234",
          vehicleType: "Truck",
          makeModel: "Example Model",
          capacityKg: "10000",
          trailerNumber: "",
          insuranceNumber: "INS-TEST-1",
          insuranceExpiresOn: "2027-01-01",
          vehiclePermitNumber: "VP-TEST-1",
          vehiclePermitExpiresOn: "2027-01-01",
          pin: "123456",
        }),
      }),
      config,
    );

    expect(response?.status).toBe(201);
    await expect(response?.json()).resolves.toMatchObject({ status: "linked", driverId });
    expect(writes.map(({ path }) => path)).toEqual([
      "/rest/v1/transporters",
      "/rest/v1/drivers",
      "/rest/v1/vehicles",
      "/rest/v1/profiles",
    ]);
    const driverWrite = writes.find(({ path }) => path === "/rest/v1/drivers");
    const vehicleWrite = writes.find(({ path }) => path === "/rest/v1/vehicles");
    const profileWrite = writes.find(({ path }) => path === "/rest/v1/profiles");
    if (!driverWrite || !vehicleWrite || !profileWrite) {
      throw new Error("Expected transporter, driver, vehicle, and profile inserts.");
    }
    expect(writes.slice(0, 3).every(({ body }) => body["created_by"] === userId)).toBe(true);
    expect(driverWrite.body).toMatchObject({ transporter_id: transporterId });
    expect(vehicleWrite.body).toMatchObject({ transporter_id: transporterId });
    expect(profileWrite.body).toMatchObject({ user_id: userId, role: "driver", farmer_id: null });
  });
});
