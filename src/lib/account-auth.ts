import { getSupabaseClient } from "@/lib/supabase";
import { isSixDigitPin, phoneToAuthEmail } from "@/lib/phone-auth";
import type { FarmerProfileDraft } from "@/lib/farmer-profile";
import type { DriverRegistrationDraft } from "@/lib/driver-profile";

export type AccountKind = "farmer" | "driver" | "staff";

export type AccountFarm = {
  id: string;
  farmer_id: string | null;
  farm_name: string;
  province: string | null;
  district: string | null;
  ward: string | null;
  is_primary: boolean;
};

export type AccountOnboarding = {
  current_step: string;
  form_data: Record<string, unknown>;
  completed_at: string | null;
};

export type LinkedAccountProfile = {
  status: "linked";
  profile: {
    displayName: string;
    role: string;
    phone?: string;
  };
  onboarding?: AccountOnboarding | null;
  farms?: AccountFarm[];
  farmer?: {
    id: string;
    farmer_ref: string;
    grower_number: string;
    first_name: string;
    surname: string;
    farm_name: string;
    province: string;
    district: string;
    ward: string;
    phone: string;
    alternate_phone: string;
    contracting_company: string;
    status: string;
  };
  driver?: {
    id: string;
    transporter_id: string;
    full_name: string;
    phone: string;
    licence_number: string;
    licence_class: string;
    status: string;
  };
  completion?: number;
};

export type FarmerDashboard = {
  seasonSummaries: FarmerSeasonSummary[];
  contracts: FarmerContract[];
  deliveries: FarmerDelivery[];
  bales: FarmerBale[];
  baleLocations: FarmerBaleLocation[];
  qualityInspections: FarmerQualityInspection[];
  balePrices: FarmerBalePrice[];
  salesSheets: FarmerSalesSheet[];
  salesSheetItems: FarmerSalesSheetItem[];
  salesSheetAdjustments: FarmerSalesSheetAdjustment[];
  paymentRequests: FarmerPaymentRequest[];
  paymentTransactions: FarmerPaymentTransaction[];
};

type FarmerSeasonSummary = {
  contract_id: string;
  contract_ref: string;
  season_year: number;
  contracted_quantity_kg: number | string;
  delivered_expected_kg: number | string;
  received_kg: number | string;
  accepted_kg: number | string;
  purchased_kg: number | string;
  contract_balance_kg: number | string;
  paid_amount: number | string;
  outstanding_payment_amount: number | string;
};

type FarmerContract = {
  id: string;
  contract_ref: string;
  season_id: string;
  contracted_quantity_kg: number | string;
  expected_deliveries: number | null;
  starts_on: string | null;
  ends_on: string | null;
  payment_terms: string | null;
  status: string;
};

type FarmerDelivery = {
  id: string;
  delivery_ref: string;
  contract_id: string;
  season_id: string;
  expected_bale_count: number | null;
  expected_weight_kg: number | string | null;
  delivery_date: string | null;
  status: string;
};

type FarmerBale = {
  id: string;
  bale_ref: string;
  delivery_id: string | null;
  contract_id: string | null;
  season_id: string;
  bale_type: string | null;
  received_weight_kg: number | string | null;
  receiving_station: string | null;
  received_at: string | null;
};

type FarmerBaleLocation = {
  bale_id: string;
  location_ref: string | null;
  location_updated_at: string | null;
};

type FarmerQualityInspection = {
  bale_id: string;
  inspection_number: number;
  grade: string | null;
  moisture_percent: number | string | null;
  colour: string | null;
  leaf_type: string | null;
  qc_decision: string | null;
  inspected_at: string | null;
};

type FarmerBalePrice = {
  bale_id: string;
  final_price_per_kg: number | string | null;
  payable_weight_kg: number | string | null;
  purchase_value: number | string | null;
  set_at: string | null;
  locked_at: string | null;
};

type FarmerSalesSheet = {
  id: string;
  sales_sheet_ref: string;
  contract_id: string | null;
  delivery_id: string | null;
  gross_amount: number | string;
  status: string;
  created_at: string;
};

type FarmerSalesSheetItem = {
  sales_sheet_id: string;
  bale_id: string;
  weight_kg: number | string;
  grade: string;
  price_per_kg: number | string;
  amount: number | string;
};

type FarmerSalesSheetAdjustment = {
  sales_sheet_id: string;
  adjustment_type: string;
  category: string;
  description: string | null;
  amount: number | string;
  approved_at: string | null;
};

type FarmerPaymentRequest = {
  id: string;
  payment_ref: string;
  sales_sheet_id: string | null;
  amount: number | string;
  payment_method: string | null;
  collection_point: string | null;
  status: string;
  requested_at: string;
};

type FarmerPaymentTransaction = {
  payment_request_id: string;
  payment_reference: string | null;
  processed_amount: number | string | null;
  processed_at: string | null;
  collection_point: string | null;
  collected_at: string | null;
};

export type AccountSignInResult = LinkedAccountProfile | { status: "unlinked" };

export type DriverRegistrationOutcome = {
  account: AccountSignInResult;
  warning?: string;
};

async function postJson<T>(path: string, body: unknown, accessToken?: string): Promise<T> {
  const headers = new Headers({ "content-type": "application/json" });
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "The request could not be completed.");
  return result;
}

async function requireSessionToken() {
  const { data, error } = await requireSupabaseClient().auth.getSession();
  if (error || !data.session) throw new Error("Sign in to continue.");
  return data.session.access_token;
}

function requireSupabaseClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase authentication is not configured for this app.");
  return client;
}

export async function checkPhoneAccount(phone: string): Promise<boolean> {
  const result = await postJson<{ exists: boolean }>("/api/auth/account-status", { phone });
  return result.exists;
}

export async function createPhoneAccount(input: {
  phone: string;
  pin: string;
  displayName: string;
  accountKind: Exclude<AccountKind, "staff">;
}): Promise<AccountSignInResult> {
  if (!isSixDigitPin(input.pin)) throw new Error("Enter your six-digit PIN.");
  requireSupabaseClient();
  await postJson<{ created: boolean }>("/api/auth/account-create", input);
  return signInWithPhonePin(input.phone, input.pin, input.accountKind);
}

export async function saveAccountOnboarding(input: {
  currentStep: string;
  formData: Record<string, unknown>;
  completed?: boolean;
}) {
  const token = await requireSessionToken();
  return postJson<{ saved: boolean }>("/api/auth/onboarding", input, token);
}

export async function saveAccountFarm(input: {
  id?: string;
  farmName: string;
  province: string;
  district: string;
  ward: string;
  isPrimary?: boolean;
}) {
  const token = await requireSessionToken();
  return postJson<{ farm: AccountFarm }>("/api/auth/farms", input, token);
}

export async function completeFarmerOnboarding(input: FarmerProfileDraft) {
  const token = await requireSessionToken();
  return postJson<{ completed: boolean; farmerId: string; warning?: string }>(
    "/api/auth/farmer-onboarding/complete",
    input,
    token,
  );
}

export async function completeDriverOnboarding(input: Omit<DriverRegistrationDraft, "pin">) {
  const token = await requireSessionToken();
  return postJson<{ status: "linked"; driverId: string; warning?: string }>(
    "/api/auth/driver-onboarding/complete",
    input,
    token,
  );
}

async function loadAccountProfile(accessToken: string): Promise<AccountSignInResult> {
  const supabase = requireSupabaseClient();
  const response = await fetch("/api/auth/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const result = (await response.json()) as AccountSignInResult | { error?: string };

  if (!response.ok) {
    await supabase.auth.signOut();
    throw new Error("Your account could not be loaded. Please try again.");
  }
  return result as AccountSignInResult;
}

export async function refreshAccountProfile(): Promise<AccountSignInResult> {
  const token = await requireSessionToken();
  return loadAccountProfile(token);
}

export async function loadFarmerDashboard(): Promise<FarmerDashboard> {
  const token = await requireSessionToken();
  const response = await fetch("/api/auth/farmer-dashboard", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = (await response.json()) as FarmerDashboard & { error?: string };
  if (!response.ok) throw new Error(result.error ?? "Your farmer records could not be loaded.");
  return result;
}

export async function signInWithPhonePin(
  phone: string,
  pin: string,
  accountKind: AccountKind,
): Promise<AccountSignInResult> {
  if (!isSixDigitPin(pin)) throw new Error("Enter your six-digit PIN.");
  const supabase = requireSupabaseClient();

  let email: string;
  try {
    email = phoneToAuthEmail(phone);
  } catch {
    throw new Error("Enter a valid mobile number.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pin,
  });
  if (error || !data.session) {
    throw new Error("Mobile number or PIN is incorrect.");
  }

  const profile = await loadAccountProfile(data.session.access_token);
  if (profile.status === "unlinked") {
    await supabase.auth.signOut();
    return profile;
  }

  const role = profile.profile.role.toLowerCase();
  if (accountKind === "farmer" && role !== "farmer") {
    await supabase.auth.signOut();
    throw new Error("This account does not have Farmer App access.");
  }
  if (accountKind === "driver" && role !== "driver" && role !== "transporter") {
    await supabase.auth.signOut();
    throw new Error("This account does not have Driver/Transporter App access.");
  }
  if (
    accountKind === "staff" &&
    (role === "farmer" || role === "driver" || role === "transporter" || role === "unassigned")
  ) {
    await supabase.auth.signOut();
    throw new Error("This account does not have an assigned staff role.");
  }
  return profile;
}

export async function registerFarmerAccount(input: {
  farmer: FarmerProfileDraft;
  pin: string;
}): Promise<AccountSignInResult> {
  if (!isSixDigitPin(input.pin)) throw new Error("Enter a six-digit PIN.");
  requireSupabaseClient();
  const response = await fetch("/api/auth/farmer-signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "The farmer account could not be created.");
  }
  return signInWithPhonePin(input.farmer.phone, input.pin, "farmer");
}

export async function registerDriverAccount(
  input: DriverRegistrationDraft,
): Promise<DriverRegistrationOutcome> {
  if (!isSixDigitPin(input.pin)) throw new Error("Enter a six-digit PIN.");
  requireSupabaseClient();
  const { pin, ...registration } = input;
  const response = await fetch("/api/auth/driver-signup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...registration, pin }),
  });
  const result = (await response.json()) as { error?: string; warning?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "The driver account could not be created.");
  }
  const account = await signInWithPhonePin(input.phone, pin, "driver");
  return result.warning ? { account, warning: result.warning } : { account };
}
