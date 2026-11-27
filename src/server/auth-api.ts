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
  const profile = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    "/rest/v1/profiles?on_conflict=user_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        user_id: userId,
        display_name: displayName,
        role: accountKind,
        farmer_id: null,
        phone_e164: phone,
      }),
    },
  );
  if (!profile.ok) {
    const profileError = await responseJson(profile.clone());
    console.error("Supabase account profile insert failed.", {
      status: profile.status,
      code: isRecord(profileError) ? stringField(profileError, "code") : null,
    });
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

type FarmerDataRows = Record<string, unknown>[];

const emptyFarmerDashboard = {
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
};

async function queryFarmerRows(
  config: { url: string; serviceKey: string },
  table: string,
  parameters: Record<string, string>,
): Promise<FarmerDataRows | Response> {
  const query = new URLSearchParams(parameters);
  const response = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/${table}?${query}`,
  );
  if (!response.ok) {
    return jsonResponse({ error: "Your live farmer records could not be loaded." }, 502);
  }
  const rows = await responseJson(response);
  if (!Array.isArray(rows) || rows.some((row) => !isRecord(row))) {
    return jsonResponse(
      { error: "Your live farmer records were returned in an invalid format." },
      502,
    );
  }
  return rows as FarmerDataRows;
}

function rowUuids(rows: FarmerDataRows, field: string): string[] | null {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = stringField(row, field);
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }
    ids.add(id);
  }
  return [...ids];
}

async function queryRelatedFarmerRows(
  config: { url: string; serviceKey: string },
  table: string,
  select: string,
  foreignKey: string,
  ids: string[],
  order?: string,
): Promise<FarmerDataRows | Response> {
  if (ids.length === 0) return [];
  return queryFarmerRows(config, table, {
    select,
    [foreignKey]: `in.(${ids.join(",")})`,
    ...(order ? { order } : {}),
  });
}

async function getFarmerDashboard(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "farmer") {
    return jsonResponse({ error: "This account cannot view farmer records." }, 403);
  }
  if (!profile.farmer_id) return jsonResponse(emptyFarmerDashboard);

  const farmerId = profile.farmer_id;
  const baseResults = await Promise.all([
    queryFarmerRows(config, "farmer_season_summary", {
      select:
        "farmer_id,farmer_ref,contract_id,contract_ref,season_id,season_year,contracted_quantity_kg,delivered_expected_kg,received_kg,accepted_kg,purchased_kg,contract_balance_kg,paid_amount,outstanding_payment_amount",
      farmer_id: `eq.${farmerId}`,
      order: "season_year.desc",
    }),
    queryFarmerRows(config, "contracts", {
      select:
        "id,contract_ref,farmer_id,season_id,contracted_quantity_kg,expected_deliveries,starts_on,ends_on,payment_terms,status",
      farmer_id: `eq.${farmerId}`,
      order: "starts_on.desc",
    }),
    queryFarmerRows(config, "deliveries", {
      select:
        "id,delivery_ref,farmer_id,contract_id,season_id,expected_bale_count,expected_weight_kg,delivery_date,status",
      farmer_id: `eq.${farmerId}`,
      order: "delivery_date.desc",
    }),
    queryFarmerRows(config, "bales", {
      select:
        "id,bale_ref,farmer_id,delivery_id,contract_id,season_id,bale_type,received_weight_kg,receiving_station,received_at",
      farmer_id: `eq.${farmerId}`,
      order: "received_at.desc",
    }),
    queryFarmerRows(config, "current_bale_locations", {
      select: "bale_id,farmer_id,location_ref,location_updated_at",
      farmer_id: `eq.${farmerId}`,
    }),
    queryFarmerRows(config, "sales_sheets", {
      select: "id,sales_sheet_ref,farmer_id,contract_id,delivery_id,gross_amount,status,created_at",
      farmer_id: `eq.${farmerId}`,
      order: "created_at.desc",
    }),
    queryFarmerRows(config, "payment_requests", {
      select:
        "id,payment_ref,farmer_id,sales_sheet_id,amount,payment_method,collection_point,status,requested_at",
      farmer_id: `eq.${farmerId}`,
      order: "requested_at.desc",
    }),
  ]);
  const failedBase = baseResults.find((result) => result instanceof Response);
  if (failedBase instanceof Response) return failedBase;
  const [
    seasonSummaries,
    contracts,
    deliveries,
    bales,
    baleLocations,
    salesSheets,
    paymentRequests,
  ] = baseResults as FarmerDataRows[];
  const baleIds = rowUuids(bales, "id");
  const salesSheetIds = rowUuids(salesSheets, "id");
  const paymentRequestIds = rowUuids(paymentRequests, "id");
  if (!baleIds || !salesSheetIds || !paymentRequestIds) {
    return jsonResponse({ error: "Your live farmer records contain invalid identifiers." }, 502);
  }

  const relatedResults = await Promise.all([
    queryRelatedFarmerRows(
      config,
      "quality_inspections",
      "bale_id,inspection_number,grade,moisture_percent,colour,leaf_type,qc_decision,inspected_at",
      "bale_id",
      baleIds,
      "inspection_number.desc",
    ),
    queryRelatedFarmerRows(
      config,
      "bale_prices",
      "bale_id,final_price_per_kg,payable_weight_kg,purchase_value,set_at,locked_at",
      "bale_id",
      baleIds,
      "set_at.desc",
    ),
    queryRelatedFarmerRows(
      config,
      "sales_sheet_items",
      "sales_sheet_id,bale_id,weight_kg,grade,price_per_kg,amount",
      "sales_sheet_id",
      salesSheetIds,
    ),
    queryRelatedFarmerRows(
      config,
      "sales_sheet_adjustments",
      "sales_sheet_id,adjustment_type,category,description,amount,approved_at",
      "sales_sheet_id",
      salesSheetIds,
      "approved_at.desc",
    ),
    queryRelatedFarmerRows(
      config,
      "payment_transactions",
      "payment_request_id,payment_reference,processed_amount,processed_at,collection_point,collected_at",
      "payment_request_id",
      paymentRequestIds,
      "processed_at.desc",
    ),
  ]);
  const failedRelated = relatedResults.find((result) => result instanceof Response);
  if (failedRelated instanceof Response) return failedRelated;
  const [
    qualityInspections,
    balePrices,
    salesSheetItems,
    salesSheetAdjustments,
    paymentTransactions,
  ] = relatedResults as FarmerDataRows[];

  return jsonResponse({
    seasonSummaries,
    contracts,
    deliveries,
    bales,
    baleLocations,
    qualityInspections,
    balePrices,
    salesSheets,
    salesSheetItems,
    salesSheetAdjustments,
    paymentRequests,
    paymentTransactions,
  });
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
    (body["isPrimary"] !== undefined && typeof body["isPrimary"] !== "boolean") ||
    (body["farmSizeHa"] !== undefined &&
      (typeof body["farmSizeHa"] !== "number" ||
        !Number.isFinite(body["farmSizeHa"]) ||
        body["farmSizeHa"] <= 0)) ||
    (body["expectedProductionKg"] !== undefined &&
      (typeof body["expectedProductionKg"] !== "number" ||
        !Number.isFinite(body["expectedProductionKg"]) ||
        body["expectedProductionKg"] <= 0)) ||
    (body["submitForAssessment"] !== undefined &&
      typeof body["submitForAssessment"] !== "boolean") ||
    (body["resetAssessment"] !== undefined && typeof body["resetAssessment"] !== "boolean") ||
    (body["submitForAssessment"] === true && body["resetAssessment"] === true)
  ) {
    return body instanceof Response
      ? body
      : jsonResponse({ error: "Farm details are invalid." }, 400);
  }
  const farmName = body["farmName"].trim();
  const submitForAssessment = body["submitForAssessment"] === true;
  if (!farmName || farmName.length > 120) {
    return jsonResponse({ error: "Enter a farm name." }, 400);
  }
  if (
    submitForAssessment &&
    (!body["id"] ||
      typeof body["farmSizeHa"] !== "number" ||
      typeof body["expectedProductionKg"] !== "number" ||
      !body["province"].trim() ||
      !body["district"].trim() ||
      !body["ward"].trim())
  ) {
    return jsonResponse(
      { error: "Complete the farm location, size, and expected production before submitting." },
      400,
    );
  }

  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "farmer") {
    return jsonResponse({ error: "Only farmer accounts can manage farms." }, 403);
  }
  const updateId = typeof body["id"] === "string" ? body["id"] : null;
  if (submitForAssessment && updateId) {
    const submissionFarmQuery = new URLSearchParams({
      select: "photo_paths",
      id: `eq.${updateId}`,
      profile_user_id: `eq.${profile.user_id}`,
      limit: "1",
    });
    const submissionFarmResponse = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/farms?${submissionFarmQuery}`,
    );
    if (!submissionFarmResponse.ok) {
      return jsonResponse({ error: "Could not verify the farm photos." }, 502);
    }
    const submissionFarms = await responseJson(submissionFarmResponse);
    if (
      !Array.isArray(submissionFarms) ||
      !isRecord(submissionFarms[0]) ||
      !Array.isArray(submissionFarms[0]["photo_paths"]) ||
      submissionFarms[0]["photo_paths"].length < 4
    ) {
      return jsonResponse(
        { error: "Upload at least four farm photos before submitting for assessment." },
        400,
      );
    }
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
    ...(typeof body["farmSizeHa"] === "number" ? { farm_size_ha: body["farmSizeHa"] } : {}),
    ...(typeof body["expectedProductionKg"] === "number"
      ? { expected_production_kg: body["expectedProductionKg"] }
      : {}),
    ...(submitForAssessment
      ? {
          review_status: "pending_assessment",
          submitted_at: new Date().toISOString(),
          assessment_notes: null,
          assessed_by: null,
          assessed_at: null,
          review_notes: null,
          reviewed_by: null,
          reviewed_at: null,
        }
      : body["resetAssessment"] === true
        ? {
            review_status: "draft",
            submitted_at: null,
            assessment_notes: null,
            assessed_by: null,
            assessed_at: null,
            review_notes: null,
            reviewed_by: null,
            reviewed_at: null,
          }
        : {}),
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

const farmPhotoBucket = "farm-photos";

function encodedStoragePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function removeFarmPhotoObjects(
  config: { url: string; serviceKey: string },
  paths: string[],
) {
  if (!paths.length) return true;
  const response = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/storage/v1/object/${farmPhotoBucket}`,
    {
      method: "DELETE",
      body: JSON.stringify({ prefixes: paths }),
    },
  );
  return response.ok;
}

async function uploadFarmPhotos(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (
    body instanceof Response ||
    !isRecord(body) ||
    typeof body["farmId"] !== "string" ||
    !Array.isArray(body["photoPaths"]) ||
    body["photoPaths"].length < 1 ||
    body["photoPaths"].some((path) => typeof path !== "string")
  ) {
    return body instanceof Response
      ? body
      : jsonResponse({ error: "Farm photo upload details are invalid." }, 400);
  }
  const farmId = body["farmId"];
  const photoPaths = body["photoPaths"].filter((path): path is string => typeof path === "string");
  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "farmer") {
    return jsonResponse({ error: "Only farmer accounts can manage farm photos." }, 403);
  }
  const expectedPrefix = `${profile.user_id}/${farmId}/`;
  if (
    new Set(photoPaths).size !== photoPaths.length ||
    photoPaths.some(
      (path) =>
        !path.startsWith(expectedPrefix) ||
        !/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path.slice(expectedPrefix.length)),
    )
  ) {
    return jsonResponse({ error: "Farm photo paths are invalid." }, 400);
  }

  const farmQuery = new URLSearchParams({
    select: "id,photo_paths",
    id: `eq.${farmId}`,
    profile_user_id: `eq.${profile.user_id}`,
    limit: "1",
  });
  const farmResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${farmQuery}`,
  );
  if (!farmResponse.ok) return jsonResponse({ error: "Could not load this farm." }, 502);
  const farmRows = await responseJson(farmResponse);
  if (!Array.isArray(farmRows) || !isRecord(farmRows[0])) {
    return jsonResponse({ error: "This farm could not be found." }, 404);
  }
  const currentPaths = Array.isArray(farmRows[0]["photo_paths"])
    ? farmRows[0]["photo_paths"].filter((path): path is string => typeof path === "string")
    : [];
  if (
    currentPaths.length + photoPaths.length > 10 ||
    photoPaths.some((path) => !path.startsWith(`${profile.user_id}/${farmId}/`)) ||
    photoPaths.some((path) => currentPaths.includes(path))
  ) {
    return jsonResponse({ error: "A farm can have no more than 10 photos." }, 400);
  }

  for (const path of photoPaths) {
    const infoResponse = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/storage/v1/object/info/${farmPhotoBucket}/${encodedStoragePath(path)}`,
    );
    if (!infoResponse.ok) {
      return jsonResponse({ error: "An uploaded farm photo could not be verified." }, 400);
    }
  }

  const updatedPhotoPaths = [...currentPaths, ...photoPaths];
  const updateQuery = new URLSearchParams({
    id: `eq.${farmId}`,
    profile_user_id: `eq.${profile.user_id}`,
    select: "*",
  });
  const updateResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${updateQuery}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ photo_paths: updatedPhotoPaths }),
    },
  );
  const updatedRows = await responseJson(updateResponse);
  if (!updateResponse.ok || !Array.isArray(updatedRows) || !isRecord(updatedRows[0])) {
    const cleanupOk = await removeFarmPhotoObjects(config, photoPaths);
    if (!cleanupOk) console.error("Could not clean up farm photos after a failed farm update.");
    return jsonResponse(
      { error: "Farm photos uploaded but could not be attached to the farm." },
      502,
    );
  }
  return jsonResponse({ farm: updatedRows[0] });
}

async function signedFarmPhotoUrls(
  config: { url: string; serviceKey: string },
  paths: string[],
): Promise<string[] | Response> {
  const signedUrls: string[] = [];
  for (const path of paths) {
    const response = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/storage/v1/object/sign/${farmPhotoBucket}/${encodedStoragePath(path)}`,
      {
        method: "POST",
        body: JSON.stringify({ expiresIn: 3600 }),
      },
    );
    const result = await responseJson(response);
    if (!response.ok || !isRecord(result) || typeof result["signedURL"] !== "string") {
      return jsonResponse({ error: "Farm photos could not be opened for assessment." }, 502);
    }
    const pathOrUrl = result["signedURL"];
    signedUrls.push(
      pathOrUrl.startsWith("http")
        ? pathOrUrl
        : `${config.url}/storage/v1${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`,
    );
  }
  return signedUrls;
}

async function getFarmAssessmentQueue(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "staff")
    return jsonResponse({ error: "Only staff can review farm assessments." }, 403);

  const farmQuery = new URLSearchParams({
    select:
      "id,profile_user_id,farmer_id,farm_name,province,district,ward,farm_size_ha,expected_production_kg,photo_paths,review_status,submitted_at,assessment_notes,review_notes,is_primary",
    review_status: "in.(pending_assessment,pending_approval)",
    order: "submitted_at.asc",
  });
  const farmsResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${farmQuery}`,
  );
  if (!farmsResponse.ok)
    return jsonResponse({ error: "Farm assessments could not be loaded." }, 502);
  const farms = await responseJson(farmsResponse);
  if (!Array.isArray(farms) || farms.some((farm) => !isRecord(farm))) {
    return jsonResponse({ error: "The farm assessment list is invalid." }, 502);
  }
  const farmRecords = farms as Record<string, unknown>[];
  const userIds = [
    ...new Set(farmRecords.map((farm) => stringField(farm, "profile_user_id"))),
  ].filter((id): id is string => id !== null);
  const profileNames = new Map<string, string>();
  if (userIds.length) {
    const profileQuery = new URLSearchParams({
      select: "user_id,display_name",
      user_id: `in.(${userIds.join(",")})`,
    });
    const profilesResponse = await makeSupabaseRequest(
      config.url,
      config.serviceKey,
      `/rest/v1/profiles?${profileQuery}`,
    );
    if (!profilesResponse.ok)
      return jsonResponse({ error: "Farm submitter details could not be loaded." }, 502);
    const profiles = await responseJson(profilesResponse);
    if (!Array.isArray(profiles) || profiles.some((item) => !isRecord(item))) {
      return jsonResponse({ error: "Farm submitter details are invalid." }, 502);
    }
    for (const item of profiles) {
      const id = stringField(item, "user_id");
      const name = stringField(item, "display_name");
      if (id && name) profileNames.set(id, name);
    }
  }

  const queue: Record<string, unknown>[] = [];
  for (const farm of farmRecords) {
    const photoPaths = Array.isArray(farm["photo_paths"])
      ? farm["photo_paths"].filter((path): path is string => typeof path === "string")
      : [];
    const photoUrls = await signedFarmPhotoUrls(config, photoPaths);
    if (photoUrls instanceof Response) return photoUrls;
    const profileUserId = stringField(farm, "profile_user_id");
    queue.push({
      ...farm,
      farmer_name: profileUserId ? (profileNames.get(profileUserId) ?? null) : null,
      photo_urls: photoUrls,
    });
  }
  return jsonResponse({ farms: queue });
}

async function reviewFarmAssessment(
  request: Request,
  config: { url: string; serviceKey: string },
): Promise<Response> {
  const body = await parseRequestBody(request);
  if (
    body instanceof Response ||
    !isRecord(body) ||
    typeof body["farmId"] !== "string" ||
    !["assessed", "approved", "rejected"].includes(String(body["decision"])) ||
    (body["notes"] !== undefined && typeof body["notes"] !== "string")
  ) {
    return body instanceof Response
      ? body
      : jsonResponse({ error: "Farm assessment decision is invalid." }, 400);
  }
  const farmId = body["farmId"];
  const decision = body["decision"] as "assessed" | "approved" | "rejected";
  const notes = typeof body["notes"] === "string" ? body["notes"].trim() : "";
  if (notes.length > 2000 || (decision === "rejected" && !notes)) {
    return jsonResponse({ error: "Add a reason when rejecting a farm." }, 400);
  }

  const user = await authenticatedUser(request, config);
  if (user instanceof Response) return user;
  const profile = await profileForUser(config, user["id"] as string);
  if (profile instanceof Response) return profile;
  if (profile.role !== "staff")
    return jsonResponse({ error: "Only staff can review farm assessments." }, 403);

  const farmQuery = new URLSearchParams({
    select: "id,review_status",
    id: `eq.${farmId}`,
    limit: "1",
  });
  const farmResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${farmQuery}`,
  );
  if (!farmResponse.ok) return jsonResponse({ error: "Could not load this farm assessment." }, 502);
  const farmRows = await responseJson(farmResponse);
  if (!Array.isArray(farmRows) || !isRecord(farmRows[0])) {
    return jsonResponse({ error: "This farm assessment could not be found." }, 404);
  }
  const currentStatus = stringField(farmRows[0], "review_status");
  if (
    (decision === "assessed" && currentStatus !== "pending_assessment") ||
    (decision === "approved" && currentStatus !== "pending_approval") ||
    (decision === "rejected" &&
      currentStatus !== "pending_assessment" &&
      currentStatus !== "pending_approval")
  ) {
    return jsonResponse({ error: "This farm has already changed review status." }, 409);
  }

  const now = new Date().toISOString();
  const values =
    decision === "assessed"
      ? {
          review_status: "pending_approval",
          assessment_notes: notes || null,
          assessed_by: profile.user_id,
          assessed_at: now,
        }
      : decision === "approved"
        ? {
            review_status: "approved",
            review_notes: notes || null,
            reviewed_by: profile.user_id,
            reviewed_at: now,
          }
        : {
            review_status: "rejected",
            review_notes: notes,
            reviewed_by: profile.user_id,
            reviewed_at: now,
          };
  const updateQuery = new URLSearchParams({
    select: "*",
    id: `eq.${farmId}`,
    review_status: `eq.${currentStatus}`,
  });
  const updateResponse = await makeSupabaseRequest(
    config.url,
    config.serviceKey,
    `/rest/v1/farms?${updateQuery}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(values),
    },
  );
  if (!updateResponse.ok)
    return jsonResponse({ error: "The farm assessment could not be updated." }, 502);
  const updatedRows = await responseJson(updateResponse);
  if (!Array.isArray(updatedRows) || !isRecord(updatedRows[0])) {
    return jsonResponse({ error: "This farm has already changed review status." }, 409);
  }
  const farm = updatedRows[0];
  const photoPaths = Array.isArray(farm["photo_paths"])
    ? farm["photo_paths"].filter((path): path is string => typeof path === "string")
    : [];
  const photoUrls = await signedFarmPhotoUrls(config, photoPaths);
  if (photoUrls instanceof Response) return photoUrls;
  return jsonResponse({ farm: { ...farm, farmer_name: null, photo_urls: photoUrls } });
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
    select:
      "id,farmer_id,farm_name,province,district,ward,farm_size_ha,expected_production_kg,photo_paths,review_status,assessment_notes,review_notes,is_primary",
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
    pathname !== "/api/auth/farms/photos" &&
    pathname !== "/api/auth/farm-assessments" &&
    pathname !== "/api/auth/farm-assessments/review" &&
    pathname !== "/api/auth/farmer-onboarding/complete" &&
    pathname !== "/api/auth/driver-onboarding/complete" &&
    pathname !== "/api/auth/farmer-signup" &&
    pathname !== "/api/auth/driver-signup" &&
    pathname !== "/api/auth/profile" &&
    pathname !== "/api/auth/farmer-dashboard"
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
  if (pathname === "/api/auth/farms/photos") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return uploadFarmPhotos(request, config);
  }
  if (pathname === "/api/auth/farm-assessments") {
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
    return getFarmAssessmentQueue(request, config);
  }
  if (pathname === "/api/auth/farm-assessments/review") {
    if (request.method !== "POST") return jsonResponse({ error: "Method not allowed." }, 405);
    return reviewFarmAssessment(request, config);
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
  if (pathname === "/api/auth/farmer-dashboard") {
    if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
    return getFarmerDashboard(request, config);
  }
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);
  return getAccountProfile(request, config);
}
