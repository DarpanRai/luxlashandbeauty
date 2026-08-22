import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { generateId } from "../../utils/id.js";
import { getTodayISO, daysUntil, getMonthKey, getMonthLabel, formatDisplayDate } from "../../utils/date.js";
import {
  STAFF_ROLES,
  detectIntent,
  extractCategory,
  extractRole,
  extractNumber,
  extractYesNo,
  extractNameGuess,
  extractPhoneAndAddress,
  extractDateGuess,
  extractTimeGuess,
  matchByIndexOrLabel,
} from "../../lib/localAssistant.js";
import AiAppointmentsModal from "./AiAppointmentsModal.jsx";
import AiListModal from "./AiListModal.jsx";

const WHEN_LABEL = {
  today: "Today's",
  tomorrow: "Tomorrow's",
  this_week: "This week's",
  all_upcoming: "All upcoming",
};
const CATEGORY_LABEL = { makeup: "Makeup", luxlash: "LuxLash", studio: "Studio" };
const FALLBACK_REPLY =
  "I'm sorry, I can only help with things related to this studio's admin panel — try asking about appointments, expenses, sales, stock, or adding a customer.";
const OWNER_ONLY_QUERIES = new Set(["list_expenses", "list_sales", "list_staff", "list_salary"]);

export default function AiAssistantWidget({
  role,
  customers,
  setCustomers,
  staff,
  setStaff,
  products,
  setProducts,
  studioExpenses,
  setStudioExpenses,
  sellItems,
  setSellItems,
  services,
  staffSalaries,
  staffIncentives,
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [resultsModal, setResultsModal] = useState(null);
  const [resultsList, setResultsList] = useState(null);
  const listRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // Click anywhere outside the open panel closes it — mousedown (not click) so
  // it fires before whatever's underneath handles its own click.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const reply = (text) => setMessages((m) => [...m, { role: "assistant", text }]);

  const runListAppointments = (when, category) => {
    const catFilter = category && category !== "all" ? category : null;
    const filtered = (customers || []).filter((c) => {
      if (c.status !== "upcoming") return false;
      if (catFilter && c.category !== catFilter) return false;
      const d = daysUntil(c.appointmentDate);
      if (d == null || Number.isNaN(d)) return false;
      if (when === "today") return d === 0;
      if (when === "tomorrow") return d === 1;
      if (when === "this_week") return d >= 0 && d <= 6;
      return d >= 0;
    });
    const label = WHEN_LABEL[when] || "Upcoming";
    setResultsModal({
      title: `${label} appointments${catFilter ? ` — ${CATEGORY_LABEL[catFilter]}` : ""}`,
      appointments: filtered,
    });
    reply(`Found ${filtered.length} appointment${filtered.length === 1 ? "" : "s"} — opening the list.`);
  };

  // ---- list_stock (both roles) ---------------------------------------------

  const runListStock = (category) => {
    const catFilter = category && category !== "all" ? category : null;
    const filtered = (products || []).filter((p) => p.stockQuantity != null && (!catFilter || p.category === catFilter));
    setResultsList({
      title: `Stock${catFilter ? ` — ${CATEGORY_LABEL[catFilter]}` : ""}`,
      columns: [
        { header: "Name", render: (r) => r.name },
        { header: "Category", render: (r) => CATEGORY_LABEL[r.category] || r.category },
        { header: "Quantity", render: (r) => r.stockQuantity },
        { header: "Status", render: (r) => (r.stockQuantity === 0 ? "Out of stock" : r.stockQuantity <= 5 ? `${r.stockQuantity} left` : "OK") },
      ],
      rows: filtered,
    });
    reply(`Found ${filtered.length} stocked item${filtered.length === 1 ? "" : "s"} — opening the list.`);
  };

  // ---- owner-only list queries ---------------------------------------------

  const runListExpenses = (month, category) => {
    const m = month || getMonthKey(getTodayISO());
    const catFilter = category && category !== "all" ? category : null;
    const source = [...(products || []), ...(studioExpenses || [])];
    const filtered = source.filter((p) => getMonthKey(p.date) === m && (!catFilter || p.category === catFilter));
    setResultsList({
      title: `Expenses — ${getMonthLabel(m)}${catFilter ? ` (${CATEGORY_LABEL[catFilter]})` : ""}`,
      columns: [
        { header: "Name", render: (r) => r.name },
        { header: "Category", render: (r) => CATEGORY_LABEL[r.category] || r.category },
        { header: "Cost", render: (r) => `Nrs ${Number(r.cost || 0).toLocaleString()}` },
        { header: "Date", render: (r) => formatDisplayDate(r.date) },
      ],
      rows: filtered,
    });
    reply(`Found ${filtered.length} expense${filtered.length === 1 ? "" : "s"} for ${getMonthLabel(m)} — opening the list.`);
  };

  const runListSales = (month, category) => {
    const m = month || getMonthKey(getTodayISO());
    const catFilter = category && category !== "all" ? category : null;
    const filtered = (sellItems || []).filter((p) => getMonthKey(p.date) === m && (!catFilter || p.category === catFilter));
    setResultsList({
      title: `Sales — ${getMonthLabel(m)}${catFilter ? ` (${CATEGORY_LABEL[catFilter]})` : ""}`,
      columns: [
        { header: "Name", render: (r) => r.name },
        { header: "Category", render: (r) => CATEGORY_LABEL[r.category] || r.category },
        { header: "Quantity", render: (r) => r.quantity ?? "—" },
        { header: "Price", render: (r) => `Nrs ${Number(r.price || 0).toLocaleString()}` },
        { header: "Date", render: (r) => formatDisplayDate(r.date) },
      ],
      rows: filtered,
    });
    reply(`Found ${filtered.length} sale${filtered.length === 1 ? "" : "s"} for ${getMonthLabel(m)} — opening the list.`);
  };

  const runListStaff = () => {
    const rows = staff || [];
    setResultsList({
      title: "All staff",
      columns: [
        { header: "Name", render: (r) => r.name },
        { header: "Role", render: (r) => r.role + (r.additionalRole && r.additionalRole !== "none" ? `, ${r.additionalRole}` : "") },
        { header: "Phone", render: (r) => r.phone || "—" },
        { header: "Joined", render: (r) => formatDisplayDate(r.joinedDate) },
        { header: "Status", render: (r) => (r.status === "active" ? "Active" : "Inactive") },
      ],
      rows,
    });
    reply(`Found ${rows.length} staff member${rows.length === 1 ? "" : "s"} — opening the list.`);
  };

  const runListSalary = (month) => {
    const m = month || getMonthKey(getTodayISO());
    const rows = (staff || [])
      .map((s) => {
        const sal = (staffSalaries || []).find((r) => r.staffId === s.id && r.month === m);
        const inc = (staffIncentives || []).find((r) => r.staffId === s.id && r.month === m);
        return { id: s.id, name: s.name, role: s.role, salary: sal?.amount, incentive: inc?.amount };
      })
      .filter((r) => r.salary != null || r.incentive != null);
    setResultsList({
      title: `Salary — ${getMonthLabel(m)}`,
      columns: [
        { header: "Name", render: (r) => r.name },
        { header: "Role", render: (r) => r.role },
        { header: "Salary", render: (r) => (r.salary != null ? `Nrs ${Number(r.salary).toLocaleString()}` : "—") },
        { header: "Incentive", render: (r) => (r.incentive != null ? `Nrs ${Number(r.incentive).toLocaleString()}` : "—") },
      ],
      rows,
    });
    reply(`Found ${rows.length} salary record${rows.length === 1 ? "" : "s"} for ${getMonthLabel(m)} — opening the list.`);
  };

  // ---- add_expense ----------------------------------------------------

  const finalizeExpense = (collected) => {
    const { category, name, cost, addToStock, stockQuantity } = collected;
    const record = {
      id: generateId(),
      category,
      name: (name || "Expense").trim(),
      brand: "",
      price: 0,
      cost: Number(cost) || 0,
      date: getTodayISO(),
      ...(category !== "studio" && addToStock ? { stockQuantity: Number(stockQuantity) || 0 } : {}),
    };
    if (category === "studio") setStudioExpenses([...(studioExpenses || []), record]);
    else setProducts([...(products || []), record]);
    const stockNote = category !== "studio" && addToStock ? ` and added ${record.stockQuantity} to stock` : "";
    setPendingAction(null);
    reply(`Added "${record.name}" (Nrs ${record.cost}) to ${CATEGORY_LABEL[category]} expenses${stockNote}.`);
  };

  const continueExpenseFlow = (text) => {
    const { step, collected } = pendingAction;

    if (step === 1) {
      const category = extractCategory(text);
      if (!category) return reply("Sorry, I didn't catch that — Makeup, LuxLash, or Studio?");
      setPendingAction({ type: "add_expense", step: 2, collected: { ...collected, category } });
      return reply('Got it. What\'s the item name and the cost? (e.g. "Lash glue, 500")');
    }

    if (step === 2) {
      const cost = extractNumber(text);
      if (cost == null) return reply('I need a cost too — try something like "Lash glue, 500".');
      const name = extractNameGuess(text, [String(cost)]) || "Expense";
      const next = { ...collected, name, cost };
      if (collected.category === "studio") return finalizeExpense(next);
      setPendingAction({ type: "add_expense", step: 3, collected: next });
      return reply("Should I add this to stock? If yes, how many?");
    }

    if (step === 3) {
      const yesNo = extractYesNo(text);
      if (yesNo === false) return finalizeExpense(collected);
      const qty = extractNumber(text);
      if (qty == null) return reply("How many should I add to stock? (Or say \"no\" to skip stock.)");
      return finalizeExpense({ ...collected, addToStock: true, stockQuantity: qty });
    }
  };

  // ---- add_staff --------------------------------------------------------

  const continueStaffFlow = (text) => {
    const staffRole = extractRole(text);
    if (!staffRole) return reply(`I need a valid role — one of: ${STAFF_ROLES.join(", ")}.`);
    const name = extractNameGuess(text, [staffRole]) || "New staff";
    const record = {
      id: generateId(),
      name: name.trim(),
      photo: null,
      role: staffRole,
      additionalRole: "none",
      phone: "",
      joinedDate: getTodayISO(),
      status: "active",
      documents: [],
    };
    setStaff([...(staff || []), record]);
    setPendingAction(null);
    reply(`Added ${record.name} as ${record.role}.`);
  };

  // ---- add_customer -------------------------------------------------------

  const finalizeCustomer = (collected) => {
    const record = {
      id: generateId(),
      category: collected.category,
      name: collected.name,
      address: collected.address || "",
      phone: collected.phone,
      appointmentDate: collected.appointmentDate,
      appointmentTime: collected.appointmentTime || "",
      assignedTo: collected.assignedTo,
      bookingDate: getTodayISO(),
      serviceId: collected.serviceId || "",
      discount: 0,
      advance: 0,
      addonIds: [],
      status: "upcoming",
    };
    setCustomers([...(customers || []), record]);
    setPendingAction(null);
    reply(
      `Added ${record.name} to ${CATEGORY_LABEL[record.category]} — appointment on ${record.appointmentDate}${
        record.appointmentTime ? ` at ${record.appointmentTime}` : ""
      }.`
    );
  };

  const continueCustomerFlow = (text) => {
    const { step, collected } = pendingAction;

    if (step === 1) {
      const category = extractCategory(text);
      if (!category || category === "studio") return reply("Sorry — Makeup or LuxLash?");
      setPendingAction({ type: "add_customer", step: 2, collected: { ...collected, category } });
      return reply("What's the customer's name?");
    }

    if (step === 2) {
      const name = text.trim();
      if (!name) return reply("I need a name to continue.");
      setPendingAction({ type: "add_customer", step: 3, collected: { ...collected, name } });
      return reply("What's their phone number and address?");
    }

    if (step === 3) {
      const { phone, address } = extractPhoneAndAddress(text);
      if (!phone) return reply("I couldn't find a phone number in that — could you include it?");
      setPendingAction({ type: "add_customer", step: 4, collected: { ...collected, phone, address: address || "" } });
      return reply('What date is the appointment? (YYYY-MM-DD, or say "today" / "tomorrow")');
    }

    if (step === 4) {
      const date = extractDateGuess(text);
      if (!date) return reply('Sorry, I need a date — try YYYY-MM-DD, or "today"/"tomorrow".');
      setPendingAction({ type: "add_customer", step: 5, collected: { ...collected, appointmentDate: date } });
      return reply('What time? (e.g. 14:30 or 2:30pm) — or say "skip"');
    }

    if (step === 5) {
      const time = extractTimeGuess(text);
      if (time === null) return reply('I couldn\'t read that time — try like 14:30 or 2:30pm, or say "skip".');
      const nextCollected = { ...collected, appointmentTime: time };
      const categoryServices = (services || []).filter((s) => s.category === collected.category);
      if (categoryServices.length === 0) {
        setPendingAction({ type: "add_customer", step: 7, collected: { ...nextCollected, serviceId: "" } });
        return reply("Who should this be assigned to?");
      }
      setPendingAction({ type: "add_customer", step: 6, collected: nextCollected });
      const list = categoryServices.map((s, i) => `${i + 1}. ${s.name} — Nrs ${s.price}`).join("\n");
      return reply(`Which service?\n${list}\nReply with the number or name.`);
    }

    if (step === 6) {
      const categoryServices = (services || []).filter((s) => s.category === collected.category);
      const match = matchByIndexOrLabel(text, categoryServices, (s) => s.name);
      if (!match) return reply("I didn't recognize that service — reply with the number from the list.");
      setPendingAction({ type: "add_customer", step: 7, collected: { ...collected, serviceId: match.id } });
      return reply("Who should this be assigned to?");
    }

    if (step === 7) {
      const assignedTo = text.trim();
      if (!assignedTo) return reply("I need someone to assign this to.");
      return finalizeCustomer({ ...collected, assignedTo });
    }
  };

  // ---- add_sell_item ------------------------------------------------------

  const finalizeSellItem = (collected) => {
    const { category, productId, name, brand, quantity, price } = collected;
    const record = {
      id: generateId(),
      category,
      name,
      brand: brand || "",
      price: Number(price) || 0,
      date: getTodayISO(),
      productId,
      quantity,
    };
    setSellItems([...(sellItems || []), record]);
    setProducts(
      (products || []).map((p) => (p.id === productId ? { ...p, stockQuantity: Math.max(0, (p.stockQuantity || 0) - quantity) } : p))
    );
    setPendingAction(null);
    reply(`Recorded the sale of ${quantity} × "${name}" for Nrs ${record.price} — stock updated.`);
  };

  const continueSellItemFlow = (text) => {
    const { step, collected } = pendingAction;

    if (step === 1) {
      const category = extractCategory(text);
      if (!category || category === "studio") return reply("Sorry — Makeup or LuxLash?");
      const stocked = (products || []).filter((p) => p.category === category && p.stockQuantity != null && p.stockQuantity > 0 && p.sellable);
      if (stocked.length === 0) {
        setPendingAction(null);
        return reply(`There's nothing in ${CATEGORY_LABEL[category]} stock to sell right now.`);
      }
      setPendingAction({ type: "add_sell_item", step: 2, collected: { ...collected, category } });
      const list = stocked.map((p, i) => `${i + 1}. ${p.name}${p.brand ? ` — ${p.brand}` : ""} (${p.stockQuantity} in stock)`).join("\n");
      return reply(`Which item?\n${list}\nReply with the number or name.`);
    }

    if (step === 2) {
      const stocked = (products || []).filter((p) => p.category === collected.category && p.stockQuantity != null && p.stockQuantity > 0 && p.sellable);
      const match = matchByIndexOrLabel(text, stocked, (p) => p.name);
      if (!match) return reply("I didn't recognize that item — reply with the number from the list.");
      setPendingAction({
        type: "add_sell_item",
        step: 3,
        collected: { ...collected, productId: match.id, name: match.name, brand: match.brand, maxQty: match.stockQuantity },
      });
      return reply(`How many? (${match.stockQuantity} available)`);
    }

    if (step === 3) {
      const qty = extractNumber(text);
      if (qty == null || qty <= 0) return reply("I need a quantity greater than 0.");
      if (qty > collected.maxQty) return reply(`Only ${collected.maxQty} left in stock — try a smaller number.`);
      setPendingAction({ type: "add_sell_item", step: 4, collected: { ...collected, quantity: qty } });
      return reply("What price did it sell for?");
    }

    if (step === 4) {
      const price = extractNumber(text);
      if (price == null) return reply("I need a price — just the number is fine.");
      return finalizeSellItem({ ...collected, price });
    }
  };

  // ---- dispatch -----------------------------------------------------------

  const handleSend = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");

    const lower = text.toLowerCase();

    if (pendingAction && /\b(cancel|nevermind|never mind|stop)\b/.test(lower)) {
      setPendingAction(null);
      return reply("No problem, cancelled.");
    }

    if (pendingAction) {
      if (pendingAction.type === "add_expense") return continueExpenseFlow(text);
      if (pendingAction.type === "add_staff") return continueStaffFlow(text);
      if (pendingAction.type === "add_customer") return continueCustomerFlow(text);
      if (pendingAction.type === "add_sell_item") return continueSellItemFlow(text);
    }

    const intent = detectIntent(text);
    if (!intent) return reply(FALLBACK_REPLY);

    if (OWNER_ONLY_QUERIES.has(intent.type) && role !== "owner") {
      return reply("You're on the staff role — only the studio owner can do that.");
    }

    if (intent.type === "list_appointments") return runListAppointments(intent.when, intent.category);
    if (intent.type === "list_stock") return runListStock(intent.category);
    if (intent.type === "list_expenses") return runListExpenses(intent.month, intent.category);
    if (intent.type === "list_sales") return runListSales(intent.month, intent.category);
    if (intent.type === "list_staff") return runListStaff();
    if (intent.type === "list_salary") return runListSalary(intent.month);

    if (intent.type === "add_expense") {
      setPendingAction({ type: "add_expense", step: 1, collected: {} });
      return reply("Sure — which category: Makeup, LuxLash, or the overall Studio?");
    }

    if (intent.type === "add_staff") {
      if (role !== "owner") return reply("You're on the staff role — only the studio owner can do that.");
      setPendingAction({ type: "add_staff", step: 1, collected: {} });
      return reply('Sure — what\'s their name and role? (e.g. "Priya, Makeup Artist - Senior")');
    }

    if (intent.type === "add_customer") {
      setPendingAction({ type: "add_customer", step: 1, collected: {} });
      return reply("Sure — Makeup or LuxLash?");
    }

    if (intent.type === "add_sell_item") {
      setPendingAction({ type: "add_sell_item", step: 1, collected: {} });
      return reply("Sure — Makeup or LuxLash?");
    }
  };

  return (
    <>
      {!open && (
        <button type="button" className="ai-fab" onClick={() => setOpen(true)}>
          <Bot size={17} />
          Let Me Help You
        </button>
      )}

      {open && (
        <div className="ai-panel" ref={panelRef}>
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <Sparkles size={15} />
              Let Me Help You
            </div>
            <button type="button" className="icon-btn" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="ai-panel-messages" ref={listRef}>
            {messages.length === 0 ? (
              <div className="ai-panel-empty">
                Ask me things like "show tomorrow's appointments", "add an expense", "book an appointment", or "record a
                sale" — I'm here to help.
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`ai-bubble ai-bubble-${m.role}`} style={{ whiteSpace: "pre-line" }}>
                  {m.text}
                </div>
              ))
            )}
          </div>

          <form className="ai-panel-input" onSubmit={handleSend}>
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend(e)}
              placeholder="Type a message…"
              autoFocus
            />
            <button type="submit" className="ai-send-btn" disabled={!draft.trim()}>
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {resultsModal && (
        <AiAppointmentsModal
          title={resultsModal.title}
          appointments={resultsModal.appointments}
          onClose={() => setResultsModal(null)}
        />
      )}

      {resultsList && (
        <AiListModal
          title={resultsList.title}
          columns={resultsList.columns}
          rows={resultsList.rows}
          onClose={() => setResultsList(null)}
        />
      )}
    </>
  );
}
