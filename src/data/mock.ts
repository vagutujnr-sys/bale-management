// Centralised mock data shared across all applications.
// Replace these with Supabase queries later; shapes mirror the intended tables.

export type Grade = "A1" | "A2" | "B1" | "B2" | "C1";
export type BaleStatus = "At Gate" | "Weighed" | "Graded" | "In Store" | "In Transit" | "Delivered";

export interface Farmer {
  id: string;
  name: string;
  phone: string;
  region: string;
  hectares: number;
  bank: string;
}

export interface Bale {
  id: string;
  farmerId: string;
  grade: Grade;
  weightKg: number;
  pricePerKg: number;
  location: string;
  receivedOn: string;
  status: BaleStatus;
  history: { label: string; at: string; stage: "Gate" | "Warehouse" | "Quality" | "Dispatch" }[];
}

export const farmers: Farmer[] = [
  { id: "TCF001245", name: "Mufaro Dube", phone: "+263 77 412 8890", region: "Mashonaland West", hectares: 4.5, bank: "CBZ •••• 2291" },
  { id: "TCF001246", name: "Tendai Moyo", phone: "+263 78 220 1123", region: "Manicaland", hectares: 3.0, bank: "Stanbic •••• 7781" },
  { id: "TCF001247", name: "Rudo Chikwanha", phone: "+263 71 909 4410", region: "Mashonaland Central", hectares: 6.2, bank: "FBC •••• 0912" },
];

export const contract = {
  id: "CT-2026-0412",
  farmerId: "TCF001245",
  season: "2026 Season",
  status: "Active",
  contractedKg: 9000,
  deliveredKg: 2544,
  inputsAdvance: 1850,
  signedOn: "14 Aug 2026",
  expiresOn: "30 Jun 2027",
  variety: "Virginia Flue-Cured (KRK26)",
  hectares: 4.5,
};

const h = (at: string) => [
  { label: "Received at Gate", at: `${at}, 09:15`, stage: "Gate" as const },
  { label: "Transferred to Warehouse", at: `${at}, 10:20`, stage: "Warehouse" as const },
  { label: "Graded", at: `${at}, 11:00`, stage: "Quality" as const },
];

export const bales: Bale[] = [
  { id: "BLS-0007536", farmerId: "TCF001245", grade: "A1", weightKg: 212, pricePerKg: 3.6, location: "Warehouse A - Row B", receivedOn: "12 Nov 2026, 09:15", status: "In Store", history: [...h("12 Nov 2026"), { label: "Ready for Dispatch", at: "12 Nov 2026, 14:30", stage: "Dispatch" }] },
  { id: "BLS-0007537", farmerId: "TCF001245", grade: "A1", weightKg: 205, pricePerKg: 3.6, location: "Warehouse A - Row B", receivedOn: "12 Nov 2026, 09:18", status: "In Store", history: h("12 Nov 2026") },
  { id: "BLS-0007538", farmerId: "TCF001245", grade: "A2", weightKg: 198, pricePerKg: 3.2, location: "Warehouse A - Row C", receivedOn: "12 Nov 2026, 09:22", status: "In Store", history: h("12 Nov 2026") },
  { id: "BLS-0007539", farmerId: "TCF001245", grade: "B1", weightKg: 221, pricePerKg: 2.7, location: "Warehouse B - Row A", receivedOn: "12 Nov 2026, 09:25", status: "In Transit", history: [...h("12 Nov 2026"), { label: "Dispatched #DSP-2026", at: "12 Nov 2026, 15:10", stage: "Dispatch" }] },
  { id: "BLS-0007540", farmerId: "TCF001246", grade: "A2", weightKg: 189, pricePerKg: 3.2, location: "Warehouse A - Row D", receivedOn: "12 Nov 2026, 10:02", status: "In Store", history: h("12 Nov 2026") },
  { id: "BLS-0007541", farmerId: "TCF001247", grade: "B2", weightKg: 230, pricePerKg: 2.4, location: "Warehouse C - Row A", receivedOn: "12 Nov 2026, 10:40", status: "Graded", history: h("12 Nov 2026").slice(0, 3) },
  { id: "BLS-0007542", farmerId: "TCF001247", grade: "A1", weightKg: 214, pricePerKg: 3.6, location: "Gate Bay 2", receivedOn: "12 Nov 2026, 11:05", status: "Weighed", history: h("12 Nov 2026").slice(0, 1) },
];

export const deliveries = [
  { id: "DLV-1182", date: "12 Nov 2026", slot: "08:00 – 10:00", bales: 12, status: "Scheduled", vehicle: "AEZ 4471", depot: "Harare Floors" },
  { id: "DLV-1104", date: "28 Oct 2026", slot: "10:00 – 12:00", bales: 8, status: "Completed", vehicle: "AEZ 4471", depot: "Harare Floors" },
  { id: "DLV-1031", date: "14 Oct 2026", slot: "07:00 – 09:00", bales: 4, status: "Completed", vehicle: "ADF 2210", depot: "Harare Floors" },
];

export const payments = [
  { id: "PAY-3391", date: "29 Oct 2026", amount: 750, method: "Bank Transfer", sheet: "SS-2026-0881", status: "Paid" },
  { id: "PAY-3301", date: "15 Oct 2026", amount: 412.5, method: "Bank Transfer", sheet: "SS-2026-0790", status: "Paid" },
  { id: "PAY-3460", date: "13 Nov 2026", amount: 1564.2, method: "Bank Transfer", sheet: "SS-2026-0952", status: "Pending" },
];

export const salesSheets = [
  { id: "SS-2026-0952", date: "12 Nov 2026", bales: 4, kg: 836, gross: 2635.8, deductions: 1071.6, net: 1564.2 },
  { id: "SS-2026-0881", date: "28 Oct 2026", bales: 8, kg: 1640, gross: 1312.0, deductions: 562.0, net: 750.0 },
  { id: "SS-2026-0790", date: "14 Oct 2026", bales: 4, kg: 68, gross: 412.5, deductions: 0, net: 412.5 },
];

export const notifications = [
  { id: "n1", title: "Delivery booked", body: "Your delivery DLV-1182 is confirmed for 12 Nov, 08:00.", time: "2h ago", unread: true },
  { id: "n2", title: "Payment pending", body: "SS-2026-0952 net $1,564.20 awaiting finance approval.", time: "5h ago", unread: true },
  { id: "n3", title: "Bale graded", body: "BLS-0007536 graded A1 at $3.60/kg.", time: "1d ago", unread: false },
];

export const journey = [
  { label: "Farmer Registration", status: "done" },
  { label: "Contract Approval", status: "done" },
  { label: "Delivery Scheduled", status: "next" },
  { label: "Bale Reception & Weighing", status: "todo" },
  { label: "Grading & Pricing", status: "todo" },
  { label: "Purchase & Payment", status: "todo" },
] as const;

export const warehouseStats = { total: 12480, transit: 320, locations: 3, accuracy: 98 };
export const gradeMix = [
  { grade: "Grade A1", pct: 38, color: "var(--chart-1)" },
  { grade: "Grade A2", pct: 34, color: "var(--chart-2)" },
  { grade: "Grade B", pct: 28, color: "var(--chart-3)" },
];

export interface Movement {
  id: string;
  type: "Receipt" | "Dispatch" | "Transfer";
  ago: string;
  bales: number;
  status: "Received" | "Dispatched" | "Transferred" | "Pending";
}
export const movements: Movement[] = [
  { id: "RCV-1047", type: "Receipt", ago: "2 hrs ago", bales: 1200, status: "Received" },
  { id: "DSP-2026", type: "Dispatch", ago: "3 hrs ago", bales: 1000, status: "Dispatched" },
  { id: "TRF-1187", type: "Transfer", ago: "5 hrs ago", bales: 500, status: "Transferred" },
  { id: "RCV-1046", type: "Receipt", ago: "Yesterday", bales: 860, status: "Received" },
];

export const storageLocations = [
  { name: "Warehouse A", rows: 6, capacity: 6000, used: 5120 },
  { name: "Warehouse B", rows: 5, capacity: 5000, used: 4310 },
  { name: "Warehouse C", rows: 4, capacity: 4000, used: 3050 },
];

export const farmerById = (id: string) => farmers.find((f) => f.id === id);
export const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
