import type { Addon } from "../types/index.js";

export const DEFAULT_ADDONS: Addon[] = [
  { id: "a-l1", category: "luxlash", name: "Wispy", price: 350 },
  { id: "a-m1", category: "makeup", name: "Sare Draping", price: 500 },
  { id: "a-m2", category: "makeup", name: "Crimp and Curls (Soft)", price: 1000 },
  { id: "a-m3", category: "makeup", name: "Sleek Bun", price: 1500 },
  { id: "a-m4", category: "makeup", name: "Soft Messybun", price: 2000 },
];

export const ADDON_MAP: Record<string, Addon> = Object.fromEntries(DEFAULT_ADDONS.map((a) => [a.id, a]));
