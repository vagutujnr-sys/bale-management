// Operational mock data for Contracting, Gate, Transport, Quality, Finance, Admin and Workstation.
// Farmer IDs and bale IDs reference src/data/mock.ts so records line up across apps.
import type { Grade } from "./mock";

export interface ContractRow { id: string; farmerId: string; farmer: string; season: string; kg: number; hectares: number; status: "Draft" | "Pending" | "Active" | "Rejected"; }
export const contracts: ContractRow[] = [
  { id: "CT-2026-0412", farmerId: "TCF001245", farmer: "Mufaro Dube", season: "2026", kg: 9000, hectares: 4.5, status: "Active" },
  { id: "CT-2026-0413", farmerId: "TCF001246", farmer: "Tendai Moyo", season: "2026", kg: 6000, hectares: 3.0, status: "Active" },
  { id: "CT-2026-0414", farmerId: "TCF001247", farmer: "Rudo Chikwanha", season: "2026", kg: 12500, hectares: 6.2, status: "Pending" },
  { id: "CT-2026-0415", farmerId: "TCF001248", farmer: "Blessing Ncube", season: "2026", kg: 4000, hectares: 2.0, status: "Pending" },
  { id: "CT-2026-0416", farmerId: "TCF001249", farmer: "Farai Mutasa", season: "2026", kg: 7200, hectares: 3.6, status: "Draft" },
];

export interface GateArrival { id: string; booking: string; vehicle: string; driver: string; farmer: string; bales: number; time: string; status: "Expected" | "Verified" | "Rejected" | "Inside"; }
export const arrivals: GateArrival[] = [
  { id: "GT-5521", booking: "DLV-1182", vehicle: "AEZ 4471", driver: "Peter Sibanda", farmer: "Mufaro Dube", bales: 12, time: "08:10", status: "Expected" },
  { id: "GT-5522", booking: "DLV-1190", vehicle: "ADF 2210", driver: "John Phiri", farmer: "Tendai Moyo", bales: 9, time: "08:35", status: "Expected" },
  { id: "GT-5519", booking: "DLV-1175", vehicle: "AGH 9081", driver: "Simba Gumbo", farmer: "Rudo Chikwanha", bales: 15, time: "07:40", status: "Inside" },
  { id: "GT-5518", booking: "DLV-1170", vehicle: "AFT 3302", driver: "Kuda Marufu", farmer: "Blessing Ncube", bales: 6, time: "07:15", status: "Verified" },
];

export interface Trip { id: string; vehicle: string; driver: string; route: string; bales: number; eta: string; status: "Planned" | "Loading" | "On Route" | "Arrived"; }
export const trips: Trip[] = [
  { id: "TRP-801", vehicle: "AEZ 4471", driver: "Peter Sibanda", route: "Chinhoyi → Harare Floors", bales: 12, eta: "08:00", status: "On Route" },
  { id: "TRP-802", vehicle: "ADF 2210", driver: "John Phiri", route: "Mutare → Harare Floors", bales: 9, eta: "10:30", status: "Loading" },
  { id: "TRP-803", vehicle: "AGH 9081", driver: "Simba Gumbo", route: "Bindura → Harare Floors", bales: 15, eta: "07:40", status: "Arrived" },
  { id: "TRP-804", vehicle: "ABX 1180", driver: "Tawanda Zulu", route: "Harare → Bulawayo DC (Dispatch)", bales: 320, eta: "16:00", status: "Planned" },
];
export const vehicles = [
  { reg: "AEZ 4471", type: "Truck 10t", status: "On trip" },
  { reg: "ADF 2210", type: "Truck 8t", status: "On trip" },
  { reg: "AGH 9081", type: "Truck 12t", status: "Available" },
  { reg: "ABX 1180", type: "Rig 30t", status: "Available" },
];

export interface QcItem { baleId: string; farmer: string; weightKg: number; grade?: Grade; price?: number; status: "Waiting" | "Graded" | "Disputed"; }
export const qcQueue: QcItem[] = [
  { baleId: "BLS-0007542", farmer: "Rudo Chikwanha", weightKg: 214, status: "Waiting" },
  { baleId: "BLS-0007543", farmer: "Blessing Ncube", weightKg: 201, status: "Waiting" },
  { baleId: "BLS-0007544", farmer: "Blessing Ncube", weightKg: 196, status: "Waiting" },
  { baleId: "BLS-0007541", farmer: "Rudo Chikwanha", weightKg: 230, grade: "B2", price: 2.4, status: "Graded" },
];
export const priceTable: Record<Grade, number> = { A1: 3.6, A2: 3.2, B1: 2.7, B2: 2.4, C1: 1.8 };

export interface SheetRow { id: string; farmer: string; bales: number; kg: number; gross: number; deductions: number; status: "Awaiting Approval" | "Approved" | "Paid" | "Rejected"; }
export const financeSheets: SheetRow[] = [
  { id: "SS-2026-0952", farmer: "Mufaro Dube", bales: 4, kg: 836, gross: 2635.8, deductions: 1071.6, status: "Awaiting Approval" },
  { id: "SS-2026-0953", farmer: "Tendai Moyo", bales: 9, kg: 1790, gross: 5191.0, deductions: 1200.0, status: "Awaiting Approval" },
  { id: "SS-2026-0950", farmer: "Rudo Chikwanha", bales: 15, kg: 3210, gross: 8667.0, deductions: 2400.0, status: "Approved" },
  { id: "SS-2026-0881", farmer: "Mufaro Dube", bales: 8, kg: 1640, gross: 1312.0, deductions: 562.0, status: "Paid" },
];

export interface AppUser { id: string; name: string; email: string; role: string; apps: string[]; active: boolean; }
export const users: AppUser[] = [
  { id: "U-01", name: "Grace Mhlanga", email: "grace@company.co.zw", role: "System Administrator", apps: ["All"], active: true },
  { id: "U-02", name: "Tafadzwa Chari", email: "tafadzwa@company.co.zw", role: "Contracting Officer", apps: ["Contracting"], active: true },
  { id: "U-03", name: "Nyasha Banda", email: "nyasha@company.co.zw", role: "Gate Clerk", apps: ["Gate"], active: true },
  { id: "U-04", name: "Chipo Mlambo", email: "chipo@company.co.zw", role: "Quality Grader", apps: ["Quality", "Workstation"], active: true },
  { id: "U-05", name: "Brian Makoni", email: "brian@company.co.zw", role: "Finance Officer", apps: ["Finance"], active: true },
  { id: "U-06", name: "Ruvimbo Sithole", email: "ruvimbo@company.co.zw", role: "Warehouse Officer", apps: ["Warehouse"], active: false },
];

export const staffApplications = [
  { key: "contracting", name: "Contracting", route: "/contracting", description: "Register farmers and manage season contracts." },
  { key: "gate", name: "Gate Operations", route: "/gate", description: "Verify delivery bookings and arrivals." },
  { key: "transport", name: "Transport", route: "/transport", description: "Plan vehicles and follow delivery trips." },
  { key: "quality", name: "Quality Control", route: "/quality", description: "Grade bales, apply prices and review disputes." },
  { key: "finance", name: "Finance", route: "/finance", description: "Approve sales sheets and record farmer payments." },
  { key: "warehouse", name: "Warehouse", route: "/warehouse", description: "Receive, locate, scan and dispatch bales." },
  { key: "workstation", name: "Operations Workstation", route: "/workstation", description: "Operate scales, label printers and floor devices." },
  { key: "admin", name: "Main Administration", route: "/admin", description: "Manage users, roles, settings and system access." },
] as const;

export type StaffApplicationKey = (typeof staffApplications)[number]["key"];

export const roles = [
  { name: "System Administrator", perms: 42 },
  { name: "Contracting Officer", perms: 11 },
  { name: "Gate Clerk", perms: 6 },
  { name: "Transport Coordinator", perms: 8 },
  { name: "Quality Grader", perms: 8 },
  { name: "Finance Officer", perms: 14 },
  { name: "Warehouse Officer", perms: 9 },
];

export const defaultRoleApplications: Record<string, StaffApplicationKey[]> = {
  "System Administrator": staffApplications.map((app) => app.key),
  "Contracting Officer": ["contracting"],
  "Gate Clerk": ["gate"],
  "Transport Coordinator": ["transport"],
  "Quality Grader": ["quality", "workstation"],
  "Finance Officer": ["finance"],
  "Warehouse Officer": ["warehouse"],
};

export const weeklyIntake = [
  { day: "Mon", bales: 820 }, { day: "Tue", bales: 1040 }, { day: "Wed", bales: 960 },
  { day: "Thu", bales: 1210 }, { day: "Fri", bales: 1380 }, { day: "Sat", bales: 640 },
];
