import { useMemo, useState } from "react";
import { Plus, Search, LayoutDashboard, Users, Package, ShoppingBag, CalendarClock, Pencil, Send, Check, MessageCircle, RefreshCw, Sparkles, Scissors, History, Bell, AlertTriangle } from "lucide-react";
import { CATEGORY } from "../../constants/categories.js";
import { STATUS } from "../../constants/status.js";
import CategoryDashboard from "../dashboard/CategoryDashboard.jsx";
import CustomerCard from "./CustomerCard.jsx";
import CustomerFormModal from "./CustomerFormModal.jsx";
import ReminderModal from "./ReminderModal.jsx";
import SentHistoryModal from "./SentHistoryModal.jsx";
import ProductsPanel from "../products/ProductsPanel.jsx";
import SellItemsPanel from "../products/SellItemsPanel.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { getTodayISO, formatDisplayDate, formatDisplayTime } from "../../utils/date.js";
import { formatMoney, getCustomerRevenue, getDueAmount } from "../../utils/format.js";
import { ADDON_MAP } from "../../constants/addons.js";
import { REFILL_MAP } from "../../constants/refills.js";
import {
  getRefillDate,
  isFollowLocked,
  isReminderLocked,
  getFollowUpStage,
  isInfillLocked,
  isFullsetLocked,
  getExtensionStage,
  getInfillWeekBucket,
  getAppointmentDateReminder,
} from "../../utils/reminder.js";

const APPOINTMENT_DATE_REMINDER_LABEL = {
  today: "Appointment today",
  tomorrow: "Appointment tomorrow",
  missed: "Appointment missed",
};
// Distinct from the Status column's colors (Upcoming/Completed/Cancelled) even
// though they sit right next to each other — this badge is about the *date*,
// Status is about the record's own state.
const APPOINTMENT_DATE_REMINDER_STYLE = {
  today: { chip: "#F6EDD8", text: "#7C5C1C" },
  tomorrow: { chip: "#E1EEE7", text: "#276148" },
  missed: { chip: "#F5E6E1", text: "#B3452F" },
};

export default function CategoryPage({
  category,
  role,
  customers,
  allCustomers,
  staff,
  products,
  sellItems,
  services,
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer,
  onSetStatus,
  onMarkReminderSent,
  onMarkFollowSent,
  onMarkInfillSent,
  onMarkFullsetSent,
  onProductsChange,
  onSellItemsChange,
}) {
  const dashboardVisible = role !== "staff";
  const [subTab, setSubTab] = useState(dashboardVisible ? "dashboard" : "customers");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [rebookCustomer, setRebookCustomer] = useState(null);
  const [lockContactEdit, setLockContactEdit] = useState(false);
  const [query, setQuery] = useState("");
  const [appointmentsQuery, setAppointmentsQuery] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [reminderTarget, setReminderTarget] = useState(null);
  const [followTarget, setFollowTarget] = useState(null);
  const [infillTarget, setInfillTarget] = useState(null);
  const [fullsetTarget, setFullsetTarget] = useState(null);
  const [messageTarget, setMessageTarget] = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const notify = useToast();

  const meta = CATEGORY[category];
  const serviceMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  const editingCustomer = editingId ? customers.find((c) => c.id === editingId) : null;
  const rebookPrefill = rebookCustomer
    ? {
        name: rebookCustomer.name,
        address: rebookCustomer.address,
        phone: rebookCustomer.phone,
        email: rebookCustomer.email || "",
        instagram: rebookCustomer.instagram || "",
        birthday: rebookCustomer.birthday || "",
        appointmentDate: getTodayISO(),
        appointmentTime: "",
        assignedTo: "",
        serviceId: rebookCustomer.serviceId,
        lashRemoval: false,
        refillId: "",
        discount: 0,
        advance: 0,
        addonIds: [],
        status: "upcoming",
      }
    : null;

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = customers.filter((c) => !c.isRebooking);
    const list = !q
      ? base
      : base.filter(
          (c) => c.name.toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.address || "").toLowerCase().includes(q)
        );
    return [...list].sort((a, b) => (a.appointmentDate || "").localeCompare(b.appointmentDate || ""));
  }, [customers, query]);

  const bookingHistory = useMemo(
    () =>
      [...customers].sort((a, b) => (b.appointmentDate || "").localeCompare(a.appointmentDate || "")),
    [customers]
  );

  const filteredBookingHistory = useMemo(() => {
    const q = appointmentsQuery.trim().toLowerCase();
    if (!q) return bookingHistory;
    return bookingHistory.filter(
      (c) => c.name.toLowerCase().includes(q) || (serviceMap[c.serviceId]?.name || "").toLowerCase().includes(q)
    );
  }, [bookingHistory, appointmentsQuery, serviceMap]);

  const openAddForm = () => {
    setEditingId(null);
    setRebookCustomer(null);
    setLockContactEdit(false);
    setFormOpen(true);
  };

  const openRebookForm = (customer) => {
    setEditingId(null);
    setRebookCustomer(customer);
    setLockContactEdit(false);
    setFormOpen(true);
  };

  const openEditForm = (customer, { fromAppointments = false } = {}) => {
    setEditingId(customer.id);
    setRebookCustomer(null);
    setLockContactEdit(fromAppointments);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setRebookCustomer(null);
    setLockContactEdit(false);
  };

  const handleSave = (data) => {
    if (editingId) {
      onEditCustomer(editingId, data);
      notify("Customer updated");
    } else {
      onAddCustomer(rebookCustomer ? { ...data, isRebooking: true, rebookedFromId: rebookCustomer.id } : data);
      notify(rebookCustomer ? "New appointment added" : "Customer added");
    }
    closeForm();
  };

  const handleSendReminder = (message) => {
    const digits = (reminderTarget.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    onMarkReminderSent(reminderTarget.id);
    setReminderTarget(null);
    notify("Reminder sent");
  };

  const handleSendFollow = (message) => {
    const digits = (followTarget.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    onMarkFollowSent(followTarget.id);
    setFollowTarget(null);
    notify("Follow-up sent");
  };

  const handleSendInfill = (message) => {
    const digits = (infillTarget.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    onMarkInfillSent(infillTarget.id, getInfillWeekBucket(infillTarget));
    setInfillTarget(null);
    notify("Infill reminder sent");
  };

  const handleSendFullset = (message) => {
    const digits = (fullsetTarget.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    onMarkFullsetSent(fullsetTarget.id);
    setFullsetTarget(null);
    notify("Full set reminder sent");
  };

  const handleSendMessage = (message) => {
    const digits = (messageTarget.phone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setMessageTarget(null);
    notify("Message sent");
  };

  // Rendered in two places: as its own full-width "Appointments" tab, and docked
  // on the right side of the "Customers" tab — kept as one definition so the two
  // never drift out of sync with each other.
  const appointmentsPanel = (
    <>
      {bookingHistory.length > 0 && (
        <div className="search-row">
          <Search size={16} className="search-icon" />
          <input
            className="search-input"
            placeholder="Search by name or service"
            value={appointmentsQuery}
            onChange={(e) => setAppointmentsQuery(e.target.value)}
          />
        </div>
      )}
      {bookingHistory.length === 0 ? (
        <div className="empty-state">
          <CalendarClock size={28} />
          <div className="empty-title">No appointments yet</div>
          <div className="empty-sub">Bookings and rebooked appointments will be listed here.</div>
        </div>
      ) : filteredBookingHistory.length === 0 ? (
        <div className="empty-inline">No appointments match your search.</div>
      ) : (
        <>
          <div className="record-count-bar">
            {appointmentsQuery
              ? `Showing ${filteredBookingHistory.length} of ${bookingHistory.length} appointments`
              : `${bookingHistory.length} appointment${bookingHistory.length === 1 ? "" : "s"} total`}
          </div>
          <div className="table-scroll">
          <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Service</th><th>Amount</th><th>Advance</th><th>Due</th><th>Booked On</th><th>Booked For</th><th>Time</th><th>Assigned to</th><th>Status</th>
              {category === "luxlash" && <th>Infill / Full Set Sent</th>}
              <th>Message</th><th></th>
            </tr>
          </thead>
          <tbody>
            {filteredBookingHistory.map((c) => {
              const service = serviceMap[c.serviceId];
              const refill = c.refillId ? REFILL_MAP[c.refillId] : null;
              const refillLabel = refill ? `${refill.group} — ${refill.duration}` : null;
              const hasBookableItem = !!service || !!refill || c.lashRemoval;
              const status = STATUS[c.status] || STATUS.upcoming;
              const addonNames = (c.addonIds || []).map((id) => ADDON_MAP[id]?.name).filter(Boolean);
              const dateReminder = getAppointmentDateReminder(c);
              const dateReminderStyle = dateReminder ? APPOINTMENT_DATE_REMINDER_STYLE[dateReminder] : null;
              return (
                <tr key={c.id}>
                  <td>
                    {c.name}
                    {dateReminder && (
                      <span
                        className="chip"
                        style={{
                          background: dateReminderStyle.chip,
                          color: dateReminderStyle.text,
                          marginLeft: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {dateReminder === "missed" ? <AlertTriangle size={10} /> : <Bell size={10} />}
                        {APPOINTMENT_DATE_REMINDER_LABEL[dateReminder]}
                      </span>
                    )}
                  </td>
                  <td>
                    {service?.name || refillLabel || (c.lashRemoval ? "Lash removal only" : "—")}
                    {refill && service && <span style={{ color: "var(--ink-muted)" }}> + Refill: {refillLabel}</span>}
                    {c.lashRemoval && (service || refill) && <span style={{ color: "var(--ink-muted)" }}> + Lash removal</span>}
                    {addonNames.length > 0 && <span style={{ color: "var(--ink-muted)" }}> + {addonNames.join(", ")}</span>}
                  </td>
                  <td>{hasBookableItem ? formatMoney(getCustomerRevenue(c, service)) : "—"}</td>
                  <td>{hasBookableItem && c.status !== "completed" ? formatMoney(c.advance) : "—"}</td>
                  <td>{hasBookableItem && c.status === "upcoming" ? formatMoney(getDueAmount(c, service)) : c.status === "cancelled" ? "" : "—"}</td>
                  <td>{formatDisplayDate(c.bookingDate, "—")}</td>
                  <td>{formatDisplayDate(c.appointmentDate, "—")}</td>
                  <td>{formatDisplayTime(c.appointmentTime, "—")}</td>
                  <td>{c.assignedTo || "—"}</td>
                  <td><span className="chip" style={{ background: status.chip, color: status.text }}>{status.label}</span></td>
                  {category === "luxlash" && (
                    <td>
                      {c.infillWeek2SentAt || c.infillWeek3SentAt || (c.fullsetSentDates || []).length > 0 ? (
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setHistoryTarget(c)}
                          title="View sent reminder history"
                        >
                          <History size={14} />
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                  <td>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => setMessageTarget(c)}
                      title="Send a custom WhatsApp message"
                    >
                      <MessageCircle size={14} />
                    </button>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                      {c.status === "upcoming" && (
                        <button
                          type="button"
                          className="icon-btn"
                          title="Edit"
                          onClick={() => openEditForm(c, { fromAppointments: true })}
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {category === "luxlash" && (() => {
                        const stage = getFollowUpStage(c, customers);
                        if (stage === "reminder") {
                          return isReminderLocked(c) ? (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-sent"
                              disabled
                              title="Reminder already sent — resets after 30 days, or once this customer is rebooked"
                            >
                              <Check size={12} /> Sent
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-pending"
                              onClick={() => setReminderTarget(c)}
                              title="Send WhatsApp reminder"
                            >
                              <Send size={12} /> Remind
                            </button>
                          );
                        }
                        if (stage === "follow") {
                          return isFollowLocked(c) ? (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-sent"
                              disabled
                              title="Follow-up already sent — resets after 30 days, or once this customer is rebooked"
                            >
                              <Check size={12} /> Sent
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-pending"
                              onClick={() => setFollowTarget(c)}
                              title="Send WhatsApp follow-up check-in"
                            >
                              <RefreshCw size={12} /> Follow
                            </button>
                          );
                        }
                        const extensionStage = getExtensionStage(c, customers);
                        if (extensionStage === "fullset") {
                          return isFullsetLocked(c) ? (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-sent"
                              disabled
                              title="Full set offer already sent — resets after 30 days, or once this customer is rebooked"
                            >
                              <Check size={12} /> Sent
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-pending"
                              onClick={() => setFullsetTarget(c)}
                              title="Send WhatsApp full set offer"
                            >
                              <Scissors size={12} /> Full Set
                            </button>
                          );
                        }
                        if (extensionStage === "infill") {
                          return isInfillLocked(c) ? (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-sent"
                              disabled
                              title="Infill reminder already sent — resets after 30 days, or once this customer is rebooked"
                            >
                              <Check size={12} /> Sent
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="reminder-btn reminder-btn-pending"
                              onClick={() => setInfillTarget(c)}
                              title="Send WhatsApp infill reminder"
                            >
                              <Sparkles size={12} /> Infill
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        </>
      )}
    </>
  );

  return (
    <div className="view">
      <div className="view-header view-header--sticky">
        <div>
          <h1 className="page-title" style={{ color: meta.text }}>{meta.label}</h1>
          <p className="page-sub">{customers.filter((c) => !c.isRebooking).length} customers on file</p>
        </div>
        <div className="sub-tabs">
          {dashboardVisible && (
            <button className={`sub-tab ${subTab === "dashboard" ? "active" : ""}`} style={subTab === "dashboard" ? { background: meta.tint, color: meta.text } : {}} onClick={() => setSubTab("dashboard")}>
              <LayoutDashboard size={15} /> Dashboard
            </button>
          )}
          <button className={`sub-tab ${subTab === "customers" ? "active" : ""}`} style={subTab === "customers" ? { background: meta.tint, color: meta.text } : {}} onClick={() => setSubTab("customers")}>
            <Users size={15} /> Customers
          </button>
          <button className={`sub-tab ${subTab === "payments" ? "active" : ""}`} style={subTab === "payments" ? { background: meta.tint, color: meta.text } : {}} onClick={() => setSubTab("payments")}>
            <CalendarClock size={15} /> Appointments
          </button>
          <button className={`sub-tab ${subTab === "products" ? "active" : ""}`} style={subTab === "products" ? { background: meta.tint, color: meta.text } : {}} onClick={() => setSubTab("products")}>
            <Package size={15} /> Expenses
          </button>
          <button className={`sub-tab ${subTab === "sellItems" ? "active" : ""}`} style={subTab === "sellItems" ? { background: meta.tint, color: meta.text } : {}} onClick={() => setSubTab("sellItems")}>
            <ShoppingBag size={15} /> Sell item
          </button>
        </div>
      </div>

      {subTab === "dashboard" && dashboardVisible ? (
        <CategoryDashboard category={category} customers={customers} serviceMap={serviceMap} products={products} sellItems={sellItems} />
      ) : subTab === "products" ? (
        <ProductsPanel category={category} meta={meta} products={products} onChange={onProductsChange} />
      ) : subTab === "sellItems" ? (
        <SellItemsPanel category={category} meta={meta} sellItems={sellItems} onChange={onSellItemsChange} />
      ) : subTab === "payments" ? (
        appointmentsPanel
      ) : (
        <>
          <div className="view-header" style={{ marginTop: 0, marginBottom: 14 }}>
            <div className="search-row" style={{ flex: 1, marginBottom: 0 }}>
              <Search size={16} className="search-icon" />
              <input className="search-input" placeholder="Search by name, phone, or address" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className="btn btn-primary" style={{ background: meta.accent }} onClick={openAddForm}>
              <Plus size={16} /> Add customer
            </button>
          </div>

          {services.length === 0 && (
            <div className="notice">Add a {meta.label.toLowerCase()} service first so appointments can be priced.</div>
          )}

          {filteredCustomers.length === 0 ? (
            <div className="empty-state">
              <Package size={28} />
              <div className="empty-title">No {meta.label.toLowerCase()} customers yet</div>
              <div className="empty-sub">Add a customer with their name, address, phone, and appointment date.</div>
              <button className="btn btn-primary" style={{ background: meta.accent }} onClick={openAddForm}>
                <Plus size={16} /> Add customer
              </button>
            </div>
          ) : (
            <div className="card-grid">
              {filteredCustomers.map((c) => (
                <CustomerCard
                  key={c.id}
                  customer={c}
                  meta={meta}
                  service={serviceMap[c.serviceId]}
                  onEdit={() => openEditForm(c)}
                  onRebook={() => openRebookForm(c)}
                  onDelete={() => setDeleteId(c.id)}
                  onSetStatus={(status) => onSetStatus(c.id, status)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {formOpen && (
        <CustomerFormModal
          meta={meta}
          category={category}
          initial={editingCustomer}
          prefill={rebookPrefill}
          lockContact={lockContactEdit}
          services={services}
          staff={staff}
          allCustomers={allCustomers}
          onCancel={closeForm}
          onSave={handleSave}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete customer?"
          message="This will permanently remove this customer's record. This can't be undone."
          onCancel={() => setDeleteId(null)}
          onConfirm={() => { onDeleteCustomer(deleteId); setDeleteId(null); notify("Customer deleted", "danger"); }}
        />
      )}

      {reminderTarget && (
        <ReminderModal
          defaultMessage={`Hello ${reminderTarget.name}, this is the reminder for your lash refill on ${formatDisplayDate(getRefillDate(reminderTarget.appointmentDate), "your next refill date")}`}
          onCancel={() => setReminderTarget(null)}
          onSend={handleSendReminder}
        />
      )}

      {followTarget && (
        <ReminderModal
          title="Send follow-up"
          defaultMessage={`Hello ${followTarget.name}, it's been a few weeks since your lash lift — just checking in on how it's holding up! Let us know if you'd like to book a touch-up.`}
          onCancel={() => setFollowTarget(null)}
          onSend={handleSendFollow}
        />
      )}

      {infillTarget && (
        <ReminderModal
          title="Send infill reminder"
          defaultMessage={`Hello ${infillTarget.name}, it's about time for an infill on your lash set to keep it full! Let us know when you'd like to book.`}
          onCancel={() => setInfillTarget(null)}
          onSend={handleSendInfill}
        />
      )}

      {fullsetTarget && (
        <ReminderModal
          title="Send full set offer"
          defaultMessage={`Hello ${fullsetTarget.name}, your lash set is due for a full redo at this point — book a new full set and we'll remove your old set for free!`}
          onCancel={() => setFullsetTarget(null)}
          onSend={handleSendFullset}
        />
      )}

      {historyTarget && (
        <SentHistoryModal customer={historyTarget} onCancel={() => setHistoryTarget(null)} />
      )}

      {messageTarget && (
        <ReminderModal
          title="Send message"
          defaultMessage={`Hello ${messageTarget.name}, `}
          onCancel={() => setMessageTarget(null)}
          onSend={handleSendMessage}
        />
      )}
    </div>
  );
}
