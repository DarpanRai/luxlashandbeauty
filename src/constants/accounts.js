// Hardcoded client-side accounts — no backend. "owner" sees everything; "staff" has a
// restricted view (see App.jsx's role-based gating): no overall Studio Dashboard, no
// Staff's section, no per-category Dashboard tab inside Makeup/LuxLash, and only the
// Items sub-tab inside Expenses (no Salary).
export const ACCOUNTS = [
  { email: "ankitapaudel33@gmail.com", password: "callM3Baby", role: "owner", name: "Ankita Paudel" },
  { email: "luxlashandbrows330@gmail.com", password: "luxlash@123", role: "staff", name: "LuxLash & Brows Staff" },
  // TEMP — testing only. Delete before real use.
  { email: "test@gmail.com", password: "test@123", role: "owner", name: "Test Account" },
];
