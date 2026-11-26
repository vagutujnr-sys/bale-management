import { getFarmerProfileCompletion, type FarmerProfileDraft } from "@/lib/farmer-profile";
import type { DriverRegistrationDraft } from "@/lib/driver-profile";
import { isSixDigitPin, normalizePhoneNumber, phoneToAuthEmail } from "@/lib/phone-auth";

type RuntimeEnv = {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

type FarmerRegistration = FarmerProfileDraft & { pin: string };
type DriverRegistration = Omit<DriverRegistrationDraft, "capacityKg" | "pin"> & {
  capacityKg: number;
  pin?: string;
};

type FarmerRow = {
  id: string;
  farmer_ref: string;
  grower_number: string;
  national_id: string;
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

type ProfileRow = {
  user_id: string;
  display_name: string;
  role: string;
  farmer_id: string | null;
};

type DriverRow = {
  id: string;
  transporter_id: string;
  full_name: string;
  phone: string;
  licence_number: string;
  licence_class: string;
  status: string;
};

function farmerProfileDraft(farmer: FarmerRow): FarmerProfileDraft {
  return {
    growerNumber: farmer.grower_number,
    nationalId: farmer.national_id,
    firstName: farmer.first_name,
    surname: farmer.surname,
    farmName: farmer.farm_name,
    province: farmer.province,
    district: farmer.district,
    ward: farmer.ward,
    phone: farmer.phone,
    alternatePhone: farmer.alternate_phone,
    contractingCompany: farmer.contracting_company,
  };
}

function runtimeValue(env: RuntimeEnv, name: keyof RuntimeEnv): string | undefined {
  const runtime = env[name];
  if (runtime) return runtime;
  if (typeof process !== "undefined") {
    const processValue = process.env[name];
    if (processValue) return processValue;
  }
  return undefined;
}

function supabaseConfig(env: unknown) {
  const runtime = (env && typeof env === "object" ? env : {}) as RuntimeEnv;
  const url = runtimeValue(runtime, "SUPABASE_URL") ?? runtimeValue(runtime, "VITE_SUPABASE_URL");
  const serviceKey = runtimeValue(runtime, "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  return { url: url.replace(/\/+$/, ""), serviceKey };
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

async function responseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function makeSupabaseRequest(
  url: string,
  serviceKey: string,
  path: string,
  init: RequestInit = {},
  accessToken = serviceKey,
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body) headers.set("content-type", "application/json");
  return fetch(`${url}${path}`, { ...init, headers });
}

function publicReference(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

async function insertResource(
  url: string,
  serviceKey: string,
  table: string,
  values: Record<string, unknown>,
): Promise<{ response: Response; rows: unknown }> {
  const response = await makeSupabaseRequest(url, serviceKey, `/rest/v1/${table}?select=*`, {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(values),
  });
  return { response, rows: await responseJson(response) };
}

function firstInsertedId(value: unknown): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  return isRecord(row) ? stringField(row, "id") : null;
}

async function parseRequestBody(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function farmerRowFromUnknown(value: unknown): FarmerRow | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const farmerRef = stringField(value, "farmer_ref");
  const growerNumber = stringField(value, "grower_number");
  const nationalId = stringField(value, "national_id");
  const firstName = stringField(value, "first_name");
  const surname = stringField(value, "surname");
  const farmName = stringField(value, "farm_name");
  const province = stringField(value, "province");
  const district = stringField(value, "district");
  const ward = stringField(value, "ward");
  const phone = stringField(value, "phone");
  const alternatePhone = stringField(value, "alternate_phone");
  const contractingCompany = stringField(value, "contracting_company");
  const status = stringField(value, "status");
  if (
    !id ||
    !farmerRef ||
    !growerNumber ||
    !nationalId ||
    !firstName ||
    !surname ||
    !farmName ||
    !province ||
    !district ||
    !ward ||
    !phone ||
    !alternatePhone ||
    !contractingCompany ||
    !status
  ) {
    return null;
  }
  return {
    id,
    farmer_ref: farmerRef,
    grower_number: growerNumber,
    national_id: nationalId,
    first_name: firstName,
    surname,
    farm_name: farmName,
    province,
    district,
    ward,
    phone,
    alternate_phone: alternatePhone,
    contracting_company: contractingCompany,
    status,
  };
}

function driverRowFromUnknown(value: unknown): DriverRow | null {
  if (!isRecord(value)) return null;
  const id = stringField(value, "id");
  const transporterId = stringField(value, "transporter_id");
  const fullName = stringField(value, "full_name");
  const phone = stringField(value, "phone");
  const licenceNumber = stringField(value, "licence_number");
  const licenceClass = stringField(value, "licence_class");
  const status = stringField(value, "status");
  if (!id || !transporterId || !fullName || !phone || !licenceNumber || !licenceClass || !status) {
    return null;
  }
  return {
    id,
    transporter_id: transporterId,
    full_name: fullName,
    phone,
    licence_number: licenceNumber,
    licence_class: licenceClass,
    status,
  };
}

function profileRowFromUnknown(value: unknown): ProfileRow | null {
  if (!isRecord(value)) return null;
  const userId = stringField(value, "user_id");
  const displayName = stringField(value, "display_name");
  const role = stringField(value, "role");
  const farmerId = value["farmer_id"];
  if (!userId || !displayName || !role || (farmerId !== null && typeof farmerId !== "string")) {
    return null;
  }
  return { user_id: userId, display_name: displayName, role, farmer_id: farmerId };
}

function phoneFromAuthUser(user: Record<string, unknown>): string | null {
  const email = stringField(user, "email");
  const alias = email?.match(/^(\d+)@phone\.auth\.invalid$/i);
  return alias ? `+${alias[1]}` : null;
}

function validateFarmerProfile(value: unknown): FarmerProfileDraft | null {
  if (!isRecord(value)) return null;
  const farmer = value;
  const fields: (keyof FarmerProfileDraft)[] = [
    "growerNumber",
    "nationalId",
    "firstName",
    "surname",
    "farmName",
    "province",
    "district",
    "ward",
    "phone",
    "alternatePhone",
    "contractingCompany",
  ];
  for (const field of fields) {
    if (typeof farmer[field] !== "string" || !farmer[field].trim()) return null;
  }
  let phone: string;
  let alternatePhone: string;
  try {
    phone = normalizePhoneNumber(farmer["phone"] as string);
    alternatePhone = normalizePhoneNumber(farmer["alternatePhone"] as string);
  } catch {
    return null;
  }

  return {
    growerNumber: (farmer["growerNumber"] as string).trim(),
    nationalId: (farmer["nationalId"] as string).trim(),
    firstName: (farmer["firstName"] as string).trim(),
    surname: (farmer["surname"] as string).trim(),
    farmName: (farmer["farmName"] as string).trim(),
    province: (farmer["province"] as string).trim(),
    district: (farmer["district"] as string).trim(),
    ward: (farmer["ward"] as string).trim(),
    phone,
    alternatePhone,
    contractingCompany: (farmer["contractingCompany"] as string).trim(),
  };
}

function validateFarmerRegistration(value: unknown): FarmerRegistration | null {
  if (!isRecord(value) || typeof value["pin"] !== "string" || !isSixDigitPin(value["pin"])) {
    return null;
  }
  const farmer = validateFarmerProfile(value["farmer"]);
  return farmer ? { ...farmer, pin: value["pin"] } : null;
}

async function farmerExists(
  url: string,
  serviceKey: string,
  column: "phone" | "grower_number" | "national_id",
  value: string,
): Promise<boolean> {
  const query = new URLSearchParams({ select: "id", [column]: `eq.${value}`, limit: "1" });
  const response = await makeSupabaseRequest(url, serviceKey, `/rest/v1/farmers?${query}`);
  if (!response.ok) throw new Error("Could not check farmer registration.");
  const rows = await responseJson(response);
  return Array.isArray(rows) && rows.length > 0;
}

async function deleteAuthUser(url: string, serviceKey: string, userId: string): Promise<boolean> {
  const response = await makeSupabaseRequest(
    url,
    serviceKey,
    `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );
  return response.ok || response.status === 404;
}

async function deleteResourceById(
  url: string,
  serviceKey: string,
  table: string,
  id: string,
): Promise<boolean> {
  const query = new URLSearchParams({ id: `eq.${id}` });
  const response = await makeSupabaseRequest(url, serviceKey, `/rest/v1/${table}?${query}`, {
    method: "DELETE",
  });
  return response.ok;
}

async function rollbackDriverRegistration(
  config: { url: string; serviceKey: string },
  ids: { userId: string; transporterId: string; driverId?: string; vehicleId?: string },
  preserveAccount = false,
): Promise<boolean> {
  if (!preserveAccount) {
    const profileQuery = new URLSearchParams({ user_id: `eq.${ids.userId}` });
    const profileResponse = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/profiles?${profileQuery}`,
      { method: "DELETE" },
    );
    if (!profileResponse.ok) return false;
  }
  if (
    ids.vehicleId &&
    !(await deleteResourceById(config.url, config.serviceKey, "vehicles", ids.vehicleId))
  ) {
    return false;
  }
  if (
    ids.driverId &&
    !(await deleteResourceById(config.url, config.serviceKey, "drivers", ids.driverId))
  ) {
    return false;
  }
  const transporterDeleted = await deleteResourceById(
    config.url,
    config.serviceKey,
    "transporters",
    ids.transporterId,
  );
  if (!transporterDeleted) return false;
  return preserveAccount || deleteAuthUser(config.url, config.serviceKey, ids.userId);
}

async function rollbackFarmerRegistration(
  config: { url: string; serviceKey: string },
  ids: { userId: string; farmerId: string },
): Promise<boolean> {
  const profileQuery = new URLSearchParams({ user_id: `eq.${ids.userId}` });
  const profileResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/profiles?${profileQuery}`,
    { method: "DELETE" },
  );
  if (!profileResponse.ok) return false;
  if (!(await deleteResourceById(config.url, config.serviceKey, "farmers", ids.farmerId))) {
    return false;
  }
  return deleteAuthUser(config.url, config.serviceKey, ids.userId);
}

async function createAuthIdentity(
  config: { url: string; serviceKey: string },
  email: string,
  pin: string,
  accountKind: "farmer" | "driver",
  displayName: string,
): Promise<{ userId: string } | Response> {
  const createUserResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/auth/v1/admin/users",
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password: pin,
        email_confirm: true,
        user_metadata: { account_type: accountKind, display_name: displayName },
      }),
    },
  );
  const createdUser = await responseJson(createUserResponse);
  if (!createUserResponse.ok || !isRecord(createdUser) || typeof createdUser["id"] !== "string") {
    const message = isRecord(createdUser) ? String(createdUser["message"] ?? "") : "";
    if (/already registered|already exists|email_exists/i.test(message)) {
      return jsonResponse(
        { error: "An account already exists for this phone. Sign in with your PIN." },
        409,
      );
    }
    return jsonResponse({ error: "The account could not be created." }, 502);
  }

  const userId = createdUser["id"];
  return { userId };
}

async function resourceExists(
  url: string,
  serviceKey: string,
  table: string,
  column: string,
  value: string,
): Promise<boolean> {
  const query = new URLSearchParams({ select: "id", [column]: `eq.${value}`, limit: "1" });
  const response = await makeSupabaseRequest(url, serviceKey, `/rest/v1/${table}?${query}`);
  if (!response.ok) throw new Error(`Could not check ${table} registration.`);
  const rows = await responseJson(response);
  return Array.isArray(rows) && rows.length > 0;
}

async function resourceId(
  url: string,
  serviceKey: string,
  table: string,
  filters: Record<string, string>,
): Promise<string | null> {
  const query = new URLSearchParams({ select: "id", limit: "1", ...filters });
  const response = await makeSupabaseRequest(url, serviceKey, `/rest/v1/${table}?${query}`);
  if (!response.ok) return null;
  const rows = await responseJson(response);
  if (!Array.isArray(rows) || !isRecord(rows[0])) return null;
  return stringField(rows[0], "id");
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateDriverRegistration(value: unknown, requirePin = true): DriverRegistration | null {
  if (!isRecord(value)) return null;
  const fields: (keyof Omit<DriverRegistrationDraft, "pin" | "trailerNumber" | "capacityKg">)[] = [
    "transporterName",
    "transporterRegistrationNumber",
    "transporterContactPerson",
    "transporterPhone",
    "transporterAddress",
    "transporterPermitNumber",
    "transporterPermitExpiresOn",
    "fullName",
    "nationalId",
    "phone",
    "licenceNumber",
    "licenceClass",
    "licenceExpiresOn",
    "vehicleRegistrationNumber",
    "vehicleType",
    "makeModel",
    "insuranceNumber",
    "insuranceExpiresOn",
    "vehiclePermitNumber",
    "vehiclePermitExpiresOn",
  ];
  for (const field of fields) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || !fieldValue.trim()) return null;
  }
  const pin = value["pin"];
  const capacityText = value["capacityKg"];
  const trailerNumber = value["trailerNumber"];
  if (
    (requirePin && (typeof pin !== "string" || !/^\d{6}$/.test(pin))) ||
    (pin !== undefined && (typeof pin !== "string" || !/^\d{6}$/.test(pin))) ||
    typeof capacityText !== "string" ||
    !Number.isFinite(Number(capacityText)) ||
    Number(capacityText) <= 0 ||
    (trailerNumber !== undefined && typeof trailerNumber !== "string")
  ) {
    return null;
  }
  const dateFields = [
    "transporterPermitExpiresOn",
    "licenceExpiresOn",
    "insuranceExpiresOn",
    "vehiclePermitExpiresOn",
  ] as const;
  for (const field of dateFields) {
    if (!isValidIsoDate(value[field] as string)) return null;
  }
  let phone: string;
  let transporterPhone: string;
  try {
    phone = normalizePhoneNumber(value["phone"] as string);
    transporterPhone = normalizePhoneNumber(value["transporterPhone"] as string);
  } catch {
    return null;
  }
  const result = Object.fromEntries(
    fields.map((field) => [field, (value[field] as string).trim()]),
  ) as Omit<DriverRegistrationDraft, "pin" | "capacityKg">;
  return {
    ...result,
    phone,
    transporterPhone,
    capacityKg: Number(capacityText),
    trailerNumber: typeof trailerNumber === "string" ? trailerNumber.trim() : "",
    ...(typeof pin === "string" ? { pin } : {}),
  };
}

async function createFarmerAccount(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (body instanceof Response) return body;
  const registration = validateFarmerRegistration(body);
  if (!registration) {
    return jsonResponse(
      { error: "Complete every profile field and enter a valid phone number and six-digit PIN." },
      400,
    );
  }

  if (
    (await farmerExists(config.url, config.serviceKey, "phone", registration.phone)) ||
    (await farmerExists(
      config.url,
      config.serviceKey,
      "grower_number",
      registration.growerNumber,
    )) ||
    (await farmerExists(config.url, config.serviceKey, "national_id", registration.nationalId))
  ) {
    return jsonResponse(
      {
        error:
          "A farmer record already uses that phone number, grower number, or national ID. Sign in or contact the office.",
      },
      409,
    );
  }

  const email = phoneToAuthEmail(registration.phone);
  const identity = await createAuthIdentity(
    config,
    email,
    registration.pin,
    "farmer",
    `${registration.firstName} ${registration.surname}`,
  );
  if (identity instanceof Response) return identity;
  const { userId } = identity;

  const { response: farmerResponse, rows } = await insertResource(
    config.url,
    config.serviceKey,
    "farmers",
    {
      farmer_ref: publicReference("FAR"),
      grower_number: registration.growerNumber,
      national_id: registration.nationalId,
      first_name: registration.firstName,
      surname: registration.surname,
      farm_name: registration.farmName,
      province: registration.province,
      district: registration.district,
      ward: registration.ward,
      phone: registration.phone,
      alternate_phone: registration.alternatePhone,
      contracting_company: registration.contractingCompany,
      status: "active",
      created_by: userId,
    },
  );
  if (!farmerResponse.ok) {
    const userDeleted = await deleteAuthUser(config.url, config.serviceKey, userId);
    return jsonResponse(
      {
        error: userDeleted
          ? "The farmer profile could not be registered. Check the details and try again."
          : "The farmer profile could not be registered and account cleanup failed. Contact the office.",
      },
      502,
    );
  }

  let farmer = farmerRowFromUnknown(Array.isArray(rows) ? rows[0] : rows);
  if (!farmer) {
    const query = new URLSearchParams({
      select:
        "id,farmer_ref,grower_number,national_id,first_name,surname,farm_name,province,district,ward,phone,alternate_phone,contracting_company,status",
      phone: `eq.${registration.phone}`,
      grower_number: `eq.${registration.growerNumber}`,
      created_by: `eq.${userId}`,
      limit: "1",
    });
    const farmerResponse = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/farmers?${query}`,
    );
    if (farmerResponse.ok) {
      const rows = await responseJson(farmerResponse);
      if (Array.isArray(rows)) farmer = farmerRowFromUnknown(rows[0]);
    }
  }

  if (!farmer) {
    const farmerId = await resourceId(config.url, config.serviceKey, "farmers", {
      phone: `eq.${registration.phone}`,
      grower_number: `eq.${registration.growerNumber}`,
      created_by: `eq.${userId}`,
    });
    const rolledBack = farmerId
      ? await rollbackFarmerRegistration(config, { userId, farmerId })
      : await deleteAuthUser(config.url, config.serviceKey, userId);
    return jsonResponse(
      {
        error: rolledBack
          ? "The farmer record could not be linked. Please contact the office."
          : "The farmer record was created but account linking failed. Contact the office.",
      },
      rolledBack ? 502 : 500,
    );
  }

  const profileResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/rest/v1/profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        display_name: `${registration.firstName} ${registration.surname}`,
        role: "farmer",
        farmer_id: farmer.id,
      }),
    },
  );
  if (!profileResponse.ok) {
    const rolledBack = await rollbackFarmerRegistration(config, {
      userId,
      farmerId: farmer.id,
    });
    return jsonResponse(
      {
        error: rolledBack
          ? "The farmer account could not be linked. Please try again."
          : "The farmer record was created but account linking failed. Contact the office.",
      },
      rolledBack ? 502 : 500,
    );
  }

  return jsonResponse(
    { status: "linked", farmer: { id: farmer.id, farmerRef: farmer.farmer_ref } },
    201,
  );
}

async function completeFarmerOnboarding(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (body instanceof Response) return body;
  const farmer = validateFarmerProfile(body);
  if (!farmer) return jsonResponse({ error: "Complete the required farmer details." }, 400);

  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "farmer") {
    return jsonResponse({ error: "This account cannot be linked to a farmer profile." }, 403);
  }
  if (profile.farmer_id)
    return jsonResponse({ error: "Your farmer profile is already complete." }, 409);
  const email = stringField(user, "email");
  if (email?.toLowerCase() !== phoneToAuthEmail(farmer.phone).toLowerCase()) {
    return jsonResponse({ error: "The farmer mobile number must match your account." }, 400);
  }

  try {
    if (
      (await farmerExists(config.url, config.serviceKey, "phone", farmer.phone)) ||
      (await farmerExists(config.url, config.serviceKey, "grower_number", farmer.growerNumber)) ||
      (await farmerExists(config.url, config.serviceKey, "national_id", farmer.nationalId))
    ) {
      return jsonResponse(
        { error: "These farmer details are already registered. Contact the office for help." },
        409,
      );
    }
  } catch {
    return jsonResponse({ error: "Could not verify the farmer details." }, 502);
  }

  const { response: farmerResponse, rows: farmerRows } = await insertResource(
    config.url,
    config.serviceKey,
    "farmers",
    {
      farmer_ref: publicReference("FRM"),
      grower_number: farmer.growerNumber,
      national_id: farmer.nationalId,
      first_name: farmer.firstName,
      surname: farmer.surname,
      farm_name: farmer.farmName,
      province: farmer.province,
      district: farmer.district,
      ward: farmer.ward,
      phone: farmer.phone,
      alternate_phone: farmer.alternatePhone,
      contracting_company: farmer.contractingCompany,
      status: "active",
      created_by: profile.user_id,
    },
  );
  const farmerId = firstInsertedId(farmerRows);
  if (!farmerResponse.ok || !farmerId) {
    return jsonResponse({ error: "Your farmer profile could not be saved." }, 502);
  }
  const cleanupFarmer = async (resetFarmLinks = false) => {
    let farmsReset = true;
    if (resetFarmLinks) {
      const resetResponse = await makeSupabaseRequest(
        config.url,
        config.serviceKey,
        `/rest/v1/farms?profile_user_id=eq.${encodeURIComponent(profile.user_id)}`,
        { method: "PATCH", body: JSON.stringify({ farmer_id: null }) },
      );
      farmsReset = resetResponse.ok;
    }
    const farmerRemoved = await deleteResourceById(
      config.url,
      config.serviceKey,
      "farmers",
      farmerId,
    );
    return farmsReset && farmerRemoved;
  };

  const farmListQuery = new URLSearchParams({
    select: "id",
    profile_user_id: `eq.${profile.user_id}`,
    limit: "1",
  });
  const existingFarmResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${farmListQuery}`,
  );
  const existingFarmRows = await responseJson(existingFarmResponse);
  if (!existingFarmResponse.ok || !Array.isArray(existingFarmRows)) {
    const rolledBack = await cleanupFarmer();
    return jsonResponse(
      {
        error: rolledBack
          ? "Could not load your farms."
          : "Your profile could not be completed and cleanup failed. Contact the office.",
      },
      rolledBack ? 502 : 500,
    );
  }
  if (existingFarmRows.length === 0) {
    const newFarm = await insertResource(config.url, config.serviceKey, "farms", {
      profile_user_id: profile.user_id,
      farmer_id: farmerId,
      farm_name: farmer.farmName,
      province: farmer.province,
      district: farmer.district,
      ward: farmer.ward,
      is_primary: true,
    });
    if (!newFarm.response.ok) {
      const rolledBack = await cleanupFarmer();
      return jsonResponse(
        {
          error: rolledBack
            ? "Your primary farm could not be saved."
            : "Your farm could not be saved and cleanup failed. Contact the office.",
        },
        rolledBack ? 502 : 500,
      );
    }
  }

  const farmQuery = new URLSearchParams({ profile_user_id: `eq.${profile.user_id}` });
  const farmResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${farmQuery}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ farmer_id: farmerId }),
    },
  );
  if (!farmResponse.ok) {
    const rolledBack = await cleanupFarmer(true);
    return jsonResponse(
      {
        error: rolledBack
          ? "Your farms could not be linked to your profile."
          : "Your farms could not be linked and cleanup failed. Contact the office.",
      },
      rolledBack ? 502 : 500,
    );
  }

  const profileQuery = new URLSearchParams({ user_id: `eq.${profile.user_id}` });
  const profileResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/profiles?${profileQuery}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ farmer_id: farmerId }),
    },
  );
  const linkedProfiles = await responseJson(profileResponse);
  if (!profileResponse.ok || !Array.isArray(linkedProfiles) || linkedProfiles.length !== 1) {
    const rolledBack = await cleanupFarmer(true);
    return jsonResponse(
      {
        error: rolledBack
          ? "Your farmer account could not be linked."
          : "Your farmer account could not be linked and cleanup failed. Contact the office.",
      },
      rolledBack ? 502 : 500,
    );
  }

  const onboardingQuery = new URLSearchParams({ user_id: `eq.${profile.user_id}` });
  const onboardingResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/account_onboarding?${onboardingQuery}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ current_step: "complete", completed_at: new Date().toISOString() }),
    },
  );
  return jsonResponse({
    completed: true,
    farmerId,
    ...(onboardingResponse.ok
      ? {}
      : { warning: "Your profile is complete, but progress could not be updated." }),
  });
}

async function createDriverAccount(
  request: Request,
  config: { url: string; serviceKey: string },
  existingAccount = false,
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (body instanceof Response) return body;
  const registration = validateDriverRegistration(body, !existingAccount);
  if (!registration) {
    return jsonResponse(
      {
        error: "Complete the required transporter, driver, vehicle, licence and insurance details.",
      },
      400,
    );
  }

  if (
    (await resourceExists(config.url, config.serviceKey, "farmers", "phone", registration.phone)) ||
    (await resourceExists(config.url, config.serviceKey, "drivers", "phone", registration.phone)) ||
    (await resourceExists(
      config.url,
      config.serviceKey,
      "drivers",
      "national_id",
      registration.nationalId,
    )) ||
    (await resourceExists(
      config.url,
      config.serviceKey,
      "drivers",
      "licence_number",
      registration.licenceNumber,
    )) ||
    (await resourceExists(
      config.url,
      config.serviceKey,
      "transporters",
      "registration_number",
      registration.transporterRegistrationNumber,
    )) ||
    (await resourceExists(
      config.url,
      config.serviceKey,
      "vehicles",
      "registration_number",
      registration.vehicleRegistrationNumber,
    ))
  ) {
    return jsonResponse(
      { error: "That phone, transporter registration, or vehicle registration is already in use." },
      409,
    );
  }

  let userId: string;
  if (existingAccount) {
    const user = await authenticatedUser(request, config);
    if (user instanceof Response) return user;
    const profile = await profileForUser(config, user["id"] as string);
    if (profile instanceof Response) return profile;
    const email = stringField(user, "email");
    const expectedEmail = phoneToAuthEmail(registration.phone);
    if (
      (profile.role !== "driver" && profile.role !== "transporter") ||
      email?.toLowerCase() !== expectedEmail.toLowerCase()
    ) {
      return jsonResponse({ error: "This account cannot be linked to these driver details." }, 403);
    }
    userId = profile.user_id;
  } else {
    if (!registration.pin) {
      return jsonResponse({ error: "Enter a six-digit PIN." }, 400);
    }
    const identity = await createAuthIdentity(
      config,
      phoneToAuthEmail(registration.phone),
      registration.pin,
      "driver",
      registration.fullName,
    );
    if (identity instanceof Response) return identity;
    userId = identity.userId;
  }
  const rollback = (ids: {
    userId: string;
    transporterId: string;
    driverId?: string;
    vehicleId?: string;
  }) => rollbackDriverRegistration(config, ids, existingAccount);
  const cleanupIdentity = () =>
    existingAccount ? Promise.resolve(true) : deleteAuthUser(config.url, config.serviceKey, userId);

  const { response: transporterResponse, rows: transporterRows } = await insertResource(
    config.url,
    config.serviceKey,
    "transporters",
    {
      transporter_ref: publicReference("TRN"),
      name: registration.transporterName,
      registration_number: registration.transporterRegistrationNumber,
      contact_person: registration.transporterContactPerson,
      phone: registration.transporterPhone,
      address: registration.transporterAddress,
      permit_number: registration.transporterPermitNumber,
      permit_expires_on: registration.transporterPermitExpiresOn,
      status: "active",
      created_by: userId,
    },
  );
  if (!transporterResponse.ok) {
    const userDeleted = await cleanupIdentity();
    return jsonResponse(
      {
        error: userDeleted
          ? "The transporter profile could not be registered. Please check the details and try again."
          : "The transporter profile could not be registered and account cleanup failed. Contact the office.",
      },
      502,
    );
  }
  const transporterId =
    firstInsertedId(transporterRows) ??
    (await resourceId(config.url, config.serviceKey, "transporters", {
      registration_number: `eq.${registration.transporterRegistrationNumber}`,
      created_by: `eq.${userId}`,
    }));
  if (!transporterId) {
    const userDeleted = existingAccount
      ? false
      : await deleteAuthUser(config.url, config.serviceKey, userId);
    return jsonResponse(
      {
        error: userDeleted
          ? "The transporter record could not be linked. Contact the office."
          : "The transporter was registered but account cleanup failed. Contact the office.",
      },
      500,
    );
  }

  const { response: driverResponse, rows: driverRows } = await insertResource(
    config.url,
    config.serviceKey,
    "drivers",
    {
      transporter_id: transporterId,
      full_name: registration.fullName,
      national_id: registration.nationalId,
      phone: registration.phone,
      licence_number: registration.licenceNumber,
      licence_class: registration.licenceClass,
      licence_expires_on: registration.licenceExpiresOn,
      status: "active",
      created_by: userId,
    },
  );
  if (!driverResponse.ok) {
    const rolledBack = await rollback({ userId, transporterId });
    return jsonResponse(
      {
        error: rolledBack
          ? "The driver could not be registered. Please check the details and try again."
          : "The transporter was saved but the driver registration could not be rolled back. Contact the office.",
      },
      502,
    );
  }
  const driverId =
    firstInsertedId(driverRows) ??
    (await resourceId(config.url, config.serviceKey, "drivers", {
      transporter_id: `eq.${transporterId}`,
      phone: `eq.${registration.phone}`,
      created_by: `eq.${userId}`,
    }));
  if (!driverId) {
    const rolledBack = await rollback({ userId, transporterId });
    return jsonResponse(
      {
        error: rolledBack
          ? "The driver record could not be linked. Please try again."
          : "The driver was registered but account linking failed. Contact the office.",
      },
      rolledBack ? 502 : 500,
    );
  }

  const { response: vehicleResponse, rows: vehicleRows } = await insertResource(
    config.url,
    config.serviceKey,
    "vehicles",
    {
      transporter_id: transporterId,
      registration_number: registration.vehicleRegistrationNumber,
      vehicle_type: registration.vehicleType,
      make_model: registration.makeModel,
      capacity_kg: registration.capacityKg,
      trailer_number: registration.trailerNumber || null,
      insurance_number: registration.insuranceNumber,
      insurance_expires_on: registration.insuranceExpiresOn,
      permit_number: registration.vehiclePermitNumber,
      permit_expires_on: registration.vehiclePermitExpiresOn,
      status: "active",
      created_by: userId,
    },
  );
  if (!vehicleResponse.ok) {
    const rolledBack = await rollback({
      userId,
      transporterId,
      driverId,
    });
    return jsonResponse(
      {
        error: rolledBack
          ? "The vehicle could not be registered. Please check the details and try again."
          : "The vehicle registration failed and could not be rolled back. Contact the transport office.",
      },
      rolledBack ? 502 : 500,
    );
  }
  const vehicleId = firstInsertedId(vehicleRows);
  if (!vehicleId) {
    const rolledBack = await rollback({
      userId,
      transporterId,
      driverId,
    });
    return jsonResponse(
      {
        error: rolledBack
          ? "The vehicle record could not be linked. Please try again."
          : "The vehicle was registered but could not be linked. Contact the transport office.",
      },
      rolledBack ? 502 : 500,
    );
  }

  const profileResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/rest/v1/profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        display_name: registration.fullName,
        role: "driver",
        farmer_id: null,
      }),
    },
  );
  if (!profileResponse.ok) {
    const rolledBack = await rollback({
      userId,
      transporterId,
      driverId,
      vehicleId,
    });
    return jsonResponse(
      {
        error: rolledBack
          ? "The driver profile could not be linked. Please try again."
          : "The driver was registered but account linking failed. Contact the office.",
      },
      rolledBack ? 502 : 500,
    );
  }

  const metadataResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/auth/v1/admin/users/${encodeURIComponent(userId)}`,
    {
      method: "PUT",
      body: JSON.stringify({
        app_metadata: {
          account_kind: "driver",
          driver_id: driverId,
          transporter_id: transporterId,
          vehicle_id: vehicleId,
        },
      }),
    },
  );
  const warnings: string[] = [];
  if (!metadataResponse.ok) {
    warnings.push(
      "The driver profile is linked by mobile number; contact the office to verify the account link.",
    );
  }
  if (existingAccount) {
    const onboardingQuery = new URLSearchParams({ user_id: `eq.${userId}` });
    const onboardingResponse = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/account_onboarding?${onboardingQuery}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ current_step: "complete", completed_at: new Date().toISOString() }),
      },
    );
    if (!onboardingResponse.ok) {
      warnings.push(
        "Your driver profile is complete, but onboarding progress could not be updated.",
      );
    }
  }
  return jsonResponse(
    {
      status: "linked",
      driverId,
      ...(warnings.length > 0 ? { warning: warnings.join(" ") } : {}),
    },
    201,
  );
}

async function checkPhoneAccount(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (body instanceof Response) return body;
  if (!isRecord(body) || typeof body["phone"] !== "string") {
    return jsonResponse({ error: "Enter a valid mobile number." }, 400);
  }

  let phone: string;
  try {
    phone = normalizePhoneNumber(body["phone"]);
  } catch {
    return jsonResponse({ error: "Enter a valid mobile number." }, 400);
  }

  const query = new URLSearchParams({
    select: "user_id",
    phone_e164: `eq.${phone}`,
    limit: "1",
  });
  const response = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/profiles?${query}`,
  );
  if (!response.ok) return jsonResponse({ error: "Could not check this mobile number." }, 502);
  const profiles = await responseJson(response);
  if (!Array.isArray(profiles)) {
    return jsonResponse({ error: "Could not check this mobile number." }, 502);
  }
  return jsonResponse({ exists: profiles.length > 0 });
}

async function createPhoneAccount(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (body instanceof Response) return body;
  if (
    !isRecord(body) ||
    (body["accountKind"] !== "farmer" && body["accountKind"] !== "driver") ||
    typeof body["phone"] !== "string" ||
    typeof body["displayName"] !== "string" ||
    typeof body["pin"] !== "string" ||
    !isSixDigitPin(body["pin"])
  ) {
    return jsonResponse({ error: "Enter your mobile number, full name, and six-digit PIN." }, 400);
  }

  const displayName = body["displayName"].trim();
  if (!displayName || displayName.length > 100) {
    return jsonResponse({ error: "Enter your full name." }, 400);
  }

  let phone: string;
  try {
    phone = normalizePhoneNumber(body["phone"]);
  } catch {
    return jsonResponse({ error: "Enter a valid mobile number." }, 400);
  }

  const phoneQuery = new URLSearchParams({
    select: "user_id",
    phone_e164: `eq.${phone}`,
    limit: "1",
  });
  const existingResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/profiles?${phoneQuery}`,
  );
  if (!existingResponse.ok) {
    return jsonResponse({ error: "Could not check this mobile number." }, 502);
  }
  const existingProfiles = await responseJson(existingResponse);
  if (!Array.isArray(existingProfiles)) {
    return jsonResponse({ error: "Could not check this mobile number." }, 502);
  }
  if (existingProfiles.length > 0) {
    return jsonResponse(
      { error: "An account already exists for this mobile number. Sign in." },
      409,
    );
  }

  const accountKind = body["accountKind"];
  const identity = await createAuthIdentity(
    config,
    phoneToAuthEmail(phone),
    body["pin"],
    accountKind,
    displayName,
  );
  if (identity instanceof Response) return identity;

  const { userId } = identity;
  const profile = await makeSupabaseRequest(config.url, config.serviceKey, "/rest/v1/profiles", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      display_name: displayName,
      role: accountKind,
      farmer_id: null,
      phone_e164: phone,
    }),
  });
  if (!profile.ok) {
    const userDeleted = await deleteAuthUser(config.url, config.serviceKey, userId);
    return jsonResponse(
      {
        error: userDeleted
          ? "Your account profile could not be created. Please try again."
          : "Your account could not be completed. Contact the office.",
      },
      userDeleted ? 502 : 500,
    );
  }

  const onboarding = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/rest/v1/account_onboarding",
    {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        role: accountKind,
        current_step: "onboarding",
        form_data: {},
      }),
    },
  );
  if (!onboarding.ok) {
    const profileQuery = new URLSearchParams({ user_id: `eq.${userId}` });
    const profileDeleted = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/profiles?${profileQuery}`,
      { method: "DELETE" },
    );
    const userDeleted =
      profileDeleted.ok && (await deleteAuthUser(config.url, config.serviceKey, userId));
    return jsonResponse(
      {
        error: userDeleted
          ? "Your account could not be initialized. Please try again."
          : "Your account was created but onboarding could not be initialized. Contact the office.",
      },
      userDeleted ? 502 : 500,
    );
  }

  return jsonResponse({ created: true }, 201);
}

async function authenticatedUser(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Record<string, unknown> | Response> {
  const accessToken = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return jsonResponse({ error: "Sign in is required." }, 401);
  const response = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/auth/v1/user",
    {},
    accessToken,
  );
  const user = await responseJson(response);
  if (!response.ok || !isRecord(user) || typeof user["id"] !== "string") {
    return jsonResponse({ error: "Your session is invalid or expired." }, 401);
  }
  return user;
}

async function profileForUser(
  config: { url: string; serviceKey: string },
  userId: string,
): Promise<ProfileRow | Response> {
  const query = new URLSearchParams({
    select: "user_id,display_name,role,farmer_id",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const response = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/profiles?${query}`,
  );
  if (!response.ok) return jsonResponse({ error: "Could not load your profile." }, 502);
  const rows = await responseJson(response);
  if (!Array.isArray(rows) || rows.length !== 1) {
    return jsonResponse({ error: "Your profile could not be found." }, 404);
  }
  const profile = profileRowFromUnknown(rows[0]);
  return profile ?? jsonResponse({ error: "Your profile data is invalid." }, 502);
}

async function saveOnboarding(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (
    body instanceof Response ||
    !isRecord(body) ||
    typeof body["currentStep"] !== "string" ||
    !isRecord(body["formData"]) ||
    body["currentStep"].length > 80 ||
    JSON.stringify(body["formData"]).length > 32_000 ||
    (body["completed"] !== undefined && typeof body["completed"] !== "boolean")
  ) {
    return body instanceof Response
      ? body
      : jsonResponse({ error: "Onboarding data is invalid." }, 400);
  }

  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "farmer" && profile.role !== "driver" && profile.role !== "transporter") {
    return jsonResponse({ error: "Onboarding is not available for this account." }, 403);
  }

  const response = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/rest/v1/account_onboarding?on_conflict=user_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: profile.user_id,
        role: profile.role,
        current_step: body["currentStep"],
        form_data: body["formData"],
        completed_at: body["completed"] ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }),
    },
  );
  if (!response.ok) {
    return jsonResponse({ error: "Your onboarding progress could not be saved." }, 502);
  }
  return jsonResponse({ saved: true });
}

async function saveFarm(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (
    body instanceof Response ||
    !isRecord(body) ||
    typeof body["farmName"] !== "string" ||
    typeof body["province"] !== "string" ||
    typeof body["district"] !== "string" ||
    typeof body["ward"] !== "string" ||
    (body["id"] !== undefined && typeof body["id"] !== "string") ||
    (body["isPrimary"] !== undefined && typeof body["isPrimary"] !== "boolean")
  ) {
    return body instanceof Response
      ? body
      : jsonResponse({ error: "Farm details are invalid." }, 400);
  }
  const farmName = body["farmName"].trim();
  if (!farmName || farmName.length > 120) {
    return jsonResponse({ error: "Enter a farm name." }, 400);
  }

  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "farmer") {
    return jsonResponse({ error: "Only farmer accounts can manage farms." }, 403);
  }

  const existingQuery = new URLSearchParams({
    select: "id",
    profile_user_id: `eq.${profile.user_id}`,
    is_primary: "eq.true",
    limit: "1",
  });
  const existingResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${existingQuery}`,
  );
  if (!existingResponse.ok) return jsonResponse({ error: "Could not load your farms." }, 502);
  const existingFarms = await responseJson(existingResponse);
  if (!Array.isArray(existingFarms)) {
    return jsonResponse({ error: "Could not load your farms." }, 502);
  }
  const requestedPrimary = body["isPrimary"] === true;
  const updateId = typeof body["id"] === "string" ? body["id"] : null;
  const existingPrimaryId =
    existingFarms.length > 0 && isRecord(existingFarms[0])
      ? stringField(existingFarms[0], "id")
      : null;
  const isPrimary =
    requestedPrimary || existingFarms.length === 0 || existingPrimaryId === updateId;
  const restorePrimary = async () => {
    if (!existingPrimaryId) return true;
    const restoreQuery = new URLSearchParams({
      id: `eq.${existingPrimaryId}`,
      profile_user_id: `eq.${profile.user_id}`,
    });
    const response = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/farms?${restoreQuery}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ is_primary: true }),
      },
    );
    return response.ok;
  };
  if (isPrimary && existingFarms.length > 0) {
    const clearPrimaryQuery = new URLSearchParams({
      profile_user_id: `eq.${profile.user_id}`,
      is_primary: "eq.true",
    });
    const clearPrimaryResponse = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/farms?${clearPrimaryQuery}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ is_primary: false }),
      },
    );
    if (!clearPrimaryResponse.ok) {
      return jsonResponse({ error: "Could not update your primary farm." }, 502);
    }
  }

  const values = {
    farmer_id: profile.farmer_id,
    farm_name: farmName,
    province: body["province"].trim(),
    district: body["district"].trim(),
    ward: body["ward"].trim(),
    is_primary: isPrimary,
  };
  let response: Response;
  let rows: unknown;
  if (updateId) {
    response = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/farms?id=eq.${encodeURIComponent(updateId)}&profile_user_id=eq.${encodeURIComponent(profile.user_id)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(values),
      },
    );
    rows = await responseJson(response);
  } else {
    const inserted = await insertResource(config.url, config.serviceKey, "farms", {
      profile_user_id: profile.user_id,
      ...values,
    });
    response = inserted.response;
    rows = inserted.rows;
  }
  if (!response.ok) {
    const restored = !isPrimary || (await restorePrimary());
    return jsonResponse(
      {
        error: restored
          ? "Your farm could not be saved."
          : "Your farm could not be saved and the primary farm could not be restored. Contact the office.",
      },
      restored ? 502 : 500,
    );
  }
  const farm = Array.isArray(rows) ? rows[0] : rows;
  if (!isRecord(farm) || typeof farm["id"] !== "string") {
    const restored = !isPrimary || (await restorePrimary());
    return jsonResponse(
      {
        error: restored
          ? "Your farm could not be loaded after saving."
          : "Your farm could not be loaded and the primary farm could not be restored. Contact the office.",
      },
      restored ? 502 : 500,
    );
  }
  return jsonResponse({ farm });
}

async function loadAccountExtras(
  config: { url: string; serviceKey: string },
  userId: string,
): Promise<{ onboarding: unknown; farms: unknown[] } | Response> {
  const onboardingQuery = new URLSearchParams({
    select: "current_step,form_data,completed_at",
    user_id: `eq.${userId}`,
    limit: "1",
  });
  const onboardingResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/account_onboarding?${onboardingQuery}`,
  );
  if (!onboardingResponse.ok) {
    return jsonResponse({ error: "Could not load your onboarding progress." }, 502);
  }
  const onboardingRows = await responseJson(onboardingResponse);
  if (!Array.isArray(onboardingRows)) {
    return jsonResponse({ error: "Your onboarding progress is invalid." }, 502);
  }

  const farmsQuery = new URLSearchParams({
    select: "id,farmer_id,farm_name,province,district,ward,is_primary",
    profile_user_id: `eq.${userId}`,
    order: "created_at.asc",
  });
  const farmsResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${farmsQuery}`,
  );
  if (!farmsResponse.ok) return jsonResponse({ error: "Could not load your farms." }, 502);
  const farms = await responseJson(farmsResponse);
  if (!Array.isArray(farms)) return jsonResponse({ error: "Your farm list is invalid." }, 502);

  return { onboarding: onboardingRows[0] ?? null, farms };
}

async function getAccountProfile(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const authorization = request.headers.get("authorization") ?? "";
  const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return jsonResponse({ error: "Sign in is required." }, 401);

  const userResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/auth/v1/user",
    {},
    accessToken,
  );
  const user = await responseJson(userResponse);
  if (!userResponse.ok || !isRecord(user) || typeof user["id"] !== "string") {
    return jsonResponse({ error: "Your session is invalid or expired." }, 401);
  }

  const profileQuery = new URLSearchParams({
    select: "user_id,display_name,role,farmer_id",
    user_id: `eq.${user["id"]}`,
    limit: "1",
  });
  const profileResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/profiles?${profileQuery}`,
  );
  if (!profileResponse.ok) return jsonResponse({ error: "Could not load your profile." }, 502);
  const profiles = await responseJson(profileResponse);
  if (!Array.isArray(profiles) || profiles.length === 0) {
    return jsonResponse({ status: "unlinked" });
  }

  const profile = profileRowFromUnknown(profiles[0]);
  if (!profile) return jsonResponse({ error: "Your profile data is invalid." }, 502);
  if (profile.role !== "farmer") {
    if (profile.role === "driver" || profile.role === "transporter") {
      const extras = await loadAccountExtras(config, profile.user_id);
      if (extras instanceof Response) return extras;
      const appMetadata = isRecord(user["app_metadata"]) ? user["app_metadata"] : null;
      let driverId = appMetadata ? stringField(appMetadata, "driver_id") : null;
      let drivers: unknown = null;
      if (driverId) {
        const driverQuery = new URLSearchParams({
          select: "id,transporter_id,full_name,phone,licence_number,licence_class,status",
          id: `eq.${driverId}`,
          limit: "1",
        });
        const driverResponse = await makeSupabaseRequest(
          config.url,
          config.serviceKey,
          `/rest/v1/drivers?${driverQuery}`,
        );
        if (!driverResponse.ok)
          return jsonResponse({ error: "Could not load your driver record." }, 502);
        drivers = await responseJson(driverResponse);
      }
      if (!Array.isArray(drivers) || drivers.length === 0) {
        const email = stringField(user, "email");
        const alias = email?.match(/^(\d+)@phone\.auth\.invalid$/i);
        if (!alias) {
          return jsonResponse({
            status: "linked",
            profile: {
              displayName: profile.display_name,
              role: profile.role,
              ...(phoneFromAuthUser(user) ? { phone: phoneFromAuthUser(user) } : {}),
            },
            ...extras,
          });
        }
        const driverPhone = `+${alias[1]}`;
        const driverQuery = new URLSearchParams({
          select: "id,transporter_id,full_name,phone,licence_number,licence_class,status",
          phone: `eq.${driverPhone}`,
          created_by: `eq.${user["id"]}`,
          limit: "2",
        });
        const driverResponse = await makeSupabaseRequest(
          config.url,
          config.serviceKey,
          `/rest/v1/drivers?${driverQuery}`,
        );
        if (!driverResponse.ok)
          return jsonResponse({ error: "Could not load your driver record." }, 502);
        drivers = await responseJson(driverResponse);
      }
      if (!Array.isArray(drivers) || drivers.length === 0) {
        return jsonResponse({
          status: "linked",
          profile: {
            displayName: profile.display_name,
            role: profile.role,
            ...(phoneFromAuthUser(user) ? { phone: phoneFromAuthUser(user) } : {}),
          },
          ...extras,
        });
      }
      if (drivers.length !== 1) {
        return jsonResponse({ error: "Your driver link is ambiguous." }, 409);
      }
      driverId = driverId ?? stringField(drivers[0], "id");
      const driver = driverRowFromUnknown(drivers[0]);
      if (!driver || driver.id !== driverId) {
        return jsonResponse({ error: "Your linked driver record could not be found." }, 404);
      }

      return jsonResponse({
        status: "linked",
        profile: {
          displayName: profile.display_name,
          role: profile.role,
          ...(phoneFromAuthUser(user) ? { phone: phoneFromAuthUser(user) } : {}),
        },
        driver,
        ...extras,
      });
    }
    return jsonResponse({
      status: "linked",
      profile: {
        displayName: profile.display_name,
        role: profile.role,
        ...(phoneFromAuthUser(user) ? { phone: phoneFromAuthUser(user) } : {}),
      },
    });
  }
  const extras = await loadAccountExtras(config, profile.user_id);
  if (extras instanceof Response) return extras;
  if (!profile.farmer_id) {
    return jsonResponse({
      status: "linked",
      profile: {
        displayName: profile.display_name,
        role: profile.role,
        ...(phoneFromAuthUser(user) ? { phone: phoneFromAuthUser(user) } : {}),
      },
      completion: 0,
      ...extras,
    });
  }

  const farmerQuery = new URLSearchParams({
    select:
      "id,farmer_ref,grower_number,national_id,first_name,surname,farm_name,province,district,ward,phone,alternate_phone,contracting_company,status",
    id: `eq.${profile.farmer_id}`,
    limit: "1",
  });
  const farmerResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farmers?${farmerQuery}`,
  );
  if (!farmerResponse.ok) return jsonResponse({ error: "Could not load your farmer record." }, 502);
  const farmers = await responseJson(farmerResponse);
  if (!Array.isArray(farmers)) {
    return jsonResponse({ error: "Your linked farmer record could not be found." }, 404);
  }
  const farmer = farmerRowFromUnknown(farmers[0]);
  if (!farmer) {
    return jsonResponse({ error: "Your linked farmer record could not be found." }, 404);
  }
  const { national_id: _nationalId, ...publicFarmerProfile } = farmer;
  return jsonResponse({
    status: "linked",
    profile: {
      displayName: profile.display_name,
      role: profile.role,
      ...(phoneFromAuthUser(user) ? { phone: phoneFromAuthUser(user) } : {}),
    },
    farmer: publicFarmerProfile,
    completion: getFarmerProfileCompletion(farmerProfileDraft(farmer)),
    ...extras,
  });
}

export async function handleAuthApiRequest(
  request: Request,
  env: unknown,
): Promise<Response | null> {
  const { pathname } = new URL(request.url);
  if (
    pathname !== "/api/auth/account-status" &&
    pathname !== "/api/auth/account-create" &&
    pathname !== "/api/auth/onboarding" &&
    pathname !== "/api/auth/farms" &&
    pathname !== "/api/auth/farmer-onboarding/complete" &&
    pathname !== "/api/auth/driver-onboarding/complete" &&
    pathname !== "/api/auth/farmer-signup" &&
    pathname !== "/api/auth/driver-signup" &&
    pathname !== "/api/auth/profile"
  ) {
    return null;
  }

  const config = supabaseConfig(env);
  if (!config)
    return jsonResponse({ error: "Server-side Supabase configuration is missing." }, 503);

  if (pathname === "/api/auth/account-status") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return checkPhoneAccount(request, config);
  }
  if (pathname === "/api/auth/account-create") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return createPhoneAccount(request, config);
  }
  if (pathname === "/api/auth/onboarding") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return saveOnboarding(request, config);
  }
  if (pathname === "/api/auth/farms") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return saveFarm(request, config);
  }
  if (pathname === "/api/auth/farmer-onboarding/complete") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return completeFarmerOnboarding(request, config);
  }
  if (pathname === "/api/auth/driver-onboarding/complete") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return createDriverAccount(request, config, true);
  }
  if (pathname === "/api/auth/farmer-signup") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return createFarmerAccount(request, config);
  }
  if (pathname === "/api/auth/driver-signup") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return createDriverAccount(request, config);
  }
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  return getAccountProfile(request, config);
}
