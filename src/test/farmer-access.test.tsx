import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Route } from "@/routes/farmer";

const { account, checkPhoneAccount, loadFarmerDashboard, signInWithPhonePin } = vi.hoisted(() => ({
  account: {
    status: "linked" as const,
    profile: {
      displayName: "Tariro Moyo",
      role: "farmer",
      phone: "+263771234567",
    },
    farms: [],
    onboarding: null,
    completion: 0,
  },
  checkPhoneAccount: vi.fn(),
  loadFarmerDashboard: vi.fn(),
  signInWithPhonePin: vi.fn(),
}));
const storage = new Map<string, string>();

vi.mock("@/lib/account-auth", () => ({
  checkPhoneAccount,
  loadFarmerDashboard,
  signInWithPhonePin,
  createPhoneAccount: vi.fn(),
  saveAccountFarm: vi.fn(),
  saveAccountOnboarding: vi.fn(),
  completeFarmerOnboarding: vi.fn(),
  refreshAccountProfile: vi.fn(),
}));

describe("farmer access before profile completion", () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, String(value)),
        removeItem: (key: string) => storage.delete(key),
        clear: () => storage.clear(),
      },
    });
    checkPhoneAccount.mockResolvedValue(true);
    loadFarmerDashboard.mockResolvedValue({
      seasonSummaries: [],
      contracts: [],
      deliveries: [],
      bales: [],
      baleLocations: [],
      qualityInspections: [],
      balePrices: [],
      salesSheets: [],
      salesSheetItems: [],
      salesSheetAdjustments: [],
      paymentRequests: [],
      paymentTransactions: [],
    });
    signInWithPhonePin.mockResolvedValue(account);
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Linux; Android 15)",
    });
  });

  it("opens Home and lets an incomplete farmer start setup from Profile", async () => {
    const FarmerRoute = Route.options.component;
    if (!FarmerRoute) throw new Error("Farmer route component is missing.");

    render(<FarmerRoute />);

    fireEvent.change(screen.getByPlaceholderText("77 123 4567"), {
      target: { value: "077 123 4567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(checkPhoneAccount).toHaveBeenCalled());

    for (const digit of "123456") {
      fireEvent.click(await screen.findByRole("button", { name: digit }));
    }

    expect(await screen.findByRole("heading", { name: "Tariro Moyo" })).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("2026 Season")).not.toBeInTheDocument();
    expect(screen.queryByText("$750.00")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your details" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More" }));
    fireEvent.click(screen.getByRole("button", { name: "My Profile" }));
    expect(await screen.findByRole("heading", { name: "My Profile" })).toBeVisible();
    expect(screen.getAllByText("+263771234567")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "Your details" })).toBeVisible();
  });

  it("renders the signed-in farmer's live contract and season summary", async () => {
    const FarmerRoute = Route.options.component;
    if (!FarmerRoute) throw new Error("Farmer route component is missing.");

    signInWithPhonePin.mockResolvedValueOnce({
      ...account,
      farmer: {
        id: "farmer-id",
        farmer_ref: "FR-100",
        grower_number: "G-100",
        first_name: "Tariro",
        surname: "Moyo",
        farm_name: "Moyo Farm",
        province: "Mashonaland",
        district: "Harare",
        ward: "Ward 1",
        phone: "+263771234567",
        alternate_phone: "",
        contracting_company: "Tobacco Co.",
        status: "active",
      },
    });
    loadFarmerDashboard.mockResolvedValueOnce({
      seasonSummaries: [
        {
          contract_id: "contract-id",
          contract_ref: "CTR-2026-001",
          season_year: 2026,
          contracted_quantity_kg: "1200",
          delivered_expected_kg: "600",
          received_kg: "500",
          accepted_kg: "450",
          purchased_kg: "400",
          contract_balance_kg: "700",
          paid_amount: "250.50",
          outstanding_payment_amount: "75.25",
        },
      ],
      contracts: [
        {
          id: "contract-id",
          contract_ref: "CTR-2026-001",
          season_id: "season-id",
          contracted_quantity_kg: "1200",
          expected_deliveries: 3,
          starts_on: "2026-03-01",
          ends_on: null,
          payment_terms: null,
          status: "active",
        },
      ],
      deliveries: [
        {
          id: "delivery-id",
          delivery_ref: "DLV-2026-001",
          contract_id: "contract-id",
          season_id: "season-id",
          expected_bale_count: 2,
          expected_weight_kg: "500",
          delivery_date: "2026-12-01",
          status: "scheduled",
        },
      ],
      bales: [
        {
          id: "bale-id",
          bale_ref: "BLS-001",
          delivery_id: "delivery-id",
          contract_id: "contract-id",
          season_id: "season-id",
          bale_type: null,
          received_weight_kg: "250",
          receiving_station: "Station 1",
          received_at: "2026-11-20T10:00:00Z",
        },
      ],
      baleLocations: [],
      qualityInspections: [
        {
          bale_id: "bale-id",
          inspection_number: 1,
          grade: "A1",
          moisture_percent: "12",
          colour: "gold",
          leaf_type: "leaf",
          qc_decision: "accepted",
          inspected_at: "2026-11-21T10:00:00Z",
        },
      ],
      balePrices: [],
      salesSheets: [],
      salesSheetItems: [],
      salesSheetAdjustments: [],
      paymentRequests: [],
      paymentTransactions: [
        {
          payment_request_id: "payment-id",
          payment_reference: "PAY-001",
          processed_amount: "250.50",
          processed_at: "2026-11-22T10:00:00Z",
          collection_point: null,
          collected_at: null,
        },
      ],
    });

    render(<FarmerRoute />);
    fireEvent.change(screen.getByPlaceholderText("77 123 4567"), {
      target: { value: "077 123 4567" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(checkPhoneAccount).toHaveBeenCalled());
    for (const digit of "123456") {
      fireEvent.click(await screen.findByRole("button", { name: digit }));
    }

    expect(await screen.findByText("$250.50")).toBeVisible();
    expect(screen.getByText("Bales Delivered")).toBeVisible();
    expect(screen.getByText("Latest Grade")).toBeVisible();
    expect(screen.getByText("A1")).toBeVisible();
    expect(screen.getByText("Last Payment")).toBeVisible();
    expect(screen.getByText("Next Delivery")).toBeVisible();
    expect(screen.getByText("1 Dec")).toBeVisible();
    expect(screen.getByRole("heading", { name: "My Tobacco Journey" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Contracts" }));
    expect(await screen.findByText(/CTR-2026-001/)).toBeVisible();
    expect(screen.getByText("Contact Tobacco Co. or your local office to apply.")).toBeVisible();
    expect(screen.getByText("1,200 kg")).toBeVisible();
  });
});
