// LuxLash refill options — a refill is an alternative to booking a new main service
// (touching up an existing lash set), grouped by lash type then duration. Prices are Nrs.
export const REFILL_OPTIONS = [
  { id: "r-classic-40", group: "Classic Refill", duration: "40 min", price: 1400 },
  { id: "r-classic-60", group: "Classic Refill", duration: "60 min (standard)", price: 1930 },
  { id: "r-classic-75", group: "Classic Refill", duration: "75 min", price: 1930 },
  { id: "r-light2d-40", group: "Light Volume (2D) Refill", duration: "40 min", price: 1490 },
  { id: "r-light2d-60", group: "Light Volume (2D) Refill", duration: "60 min (standard)", price: 2290 },
  { id: "r-light2d-75", group: "Light Volume (2D) Refill", duration: "75 min", price: 2785 },
  { id: "r-wet-40", group: "Wet Lash Refill", duration: "40 min", price: 1890 },
  { id: "r-wet-60", group: "Wet Lash Refill", duration: "60 min (standard)", price: 2350 },
  { id: "r-wet-75", group: "Wet Lash Refill", duration: "75 min", price: 2790 },
];

export const REFILL_MAP = Object.fromEntries(REFILL_OPTIONS.map((r) => [r.id, r]));
