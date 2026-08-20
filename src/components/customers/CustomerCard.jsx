import { Phone, MapPin, Calendar, Mail, Instagram, Pencil, Trash2, CalendarPlus } from "lucide-react";
import { STATUS } from "../../constants/status.js";
import { formatDisplayDate } from "../../utils/date.js";
import { formatMoney, getCustomerRevenue, getDueAmount } from "../../utils/format.js";
import { ADDON_MAP } from "../../constants/addons.js";
import { REFILL_MAP } from "../../constants/refills.js";
import { getBirthdayReminder } from "../../utils/birthday.js";
import { useToast } from "../../context/ToastContext.jsx";

export default function CustomerCard({ customer, meta, service, onEdit, onDelete, onSetStatus, onRebook }) {
  const notify = useToast();
  const status = STATUS[customer.status] || STATUS.upcoming;
  const refill = customer.refillId ? REFILL_MAP[customer.refillId] : null;
  const refillLabel = refill ? `${refill.group} — ${refill.duration}` : null;
  const primaryLabel = service?.name || refillLabel || (customer.lashRemoval ? "Lash removal only" : null);
  const birthdayReminder = getBirthdayReminder(customer.name, customer.birthday);

  const handleSetStatus = (value) => {
    onSetStatus(value);
    const labels = { upcoming: "Upcoming", completed: "Completed", cancelled: "Cancelled" };
    notify(`Status updated to ${labels[value] || value}`);
  };

  return (
    <div className="cust-card" style={{ "--tab-color": meta.accent }}>
      <div className="cust-card-top">
        <div>
          <div className="cust-name">{customer.name}</div>
          <span className="chip" style={{ background: status.chip, color: status.text }}>{status.label}</span>
        </div>
        <div className="card-actions">
          {customer.category === "luxlash" && (
            <button className="icon-btn" onClick={onRebook} title="Rebook — new appointment"><CalendarPlus size={15} /></button>
          )}
          <button className="icon-btn" onClick={onEdit} title="Edit"><Pencil size={15} /></button>
          <button className="icon-btn danger" onClick={onDelete} title="Delete"><Trash2 size={15} /></button>
        </div>
      </div>
      {birthdayReminder && (
        <div className={`cust-birthday${birthdayReminder.isToday ? " cust-birthday--today" : ""}`}>
          {birthdayReminder.message}
        </div>
      )}
      <div className="cust-detail"><Phone size={14} /> {customer.phone || "—"}</div>
      <div className="cust-detail"><MapPin size={14} /> {customer.address || "—"}</div>
      <div className="cust-detail">
        <Calendar size={14} />
        {formatDisplayDate(customer.appointmentDate, "No date set")}
      </div>
      {customer.email && (
        <div className="cust-detail"><Mail size={14} /> {customer.email}</div>
      )}
      {customer.instagram && (
        <div className="cust-detail"><Instagram size={14} /> {customer.instagram}</div>
      )}
      {(service || refill || customer.lashRemoval) && (
        <div className="cust-service-wrap">
          <div className="cust-service">
            {primaryLabel} <span className="cust-service-price">{formatMoney(getCustomerRevenue(customer, service))}</span>
          </div>
          {refill && service && (
            <div className="cust-addons">+ Refill: {refillLabel}</div>
          )}
          {customer.lashRemoval && (service || refill) && (
            <div className="cust-addons">+ Lash removal</div>
          )}
          {(customer.addonIds || []).length > 0 && (
            <div className="cust-addons">
              + {customer.addonIds.map((id) => ADDON_MAP[id]?.name).filter(Boolean).join(", ")}
            </div>
          )}
          {customer.status === "upcoming" && Number(customer.advance) > 0 && (
            <div className="cust-addons">
              Advance {formatMoney(customer.advance)} · Due {formatMoney(getDueAmount(customer, service))}
            </div>
          )}
        </div>
      )}
      <div className="cust-card-footer">
        <select
          className="status-select"
          value={customer.status}
          onChange={(e) => handleSetStatus(e.target.value)}
          disabled={customer.status === "completed"}
          title={
            customer.status === "completed"
              ? customer.category === "luxlash"
                ? "Completed appointments are locked — use Rebook for a new visit"
                : "Completed appointments are locked"
              : undefined
          }
        >
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
