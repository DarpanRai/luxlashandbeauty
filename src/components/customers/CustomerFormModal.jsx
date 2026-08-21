import { useState } from "react";
import { X } from "lucide-react";
import { getTodayISO, PROJECT_START_DATE, formatDisplayTime } from "../../utils/date.js";
import { formatMoney, LASH_REMOVAL_PRICE } from "../../utils/format.js";
import { DEFAULT_ADDONS } from "../../constants/addons.js";
import { REFILL_OPTIONS } from "../../constants/refills.js";

const PHONE_DIGITS_MIN = 10;
const PHONE_DIGITS_MAX = 15;

// Add-ons (hairstyling extras) only apply to the Party Makeup service — the
// bridal packages don't offer them.
const MAKEUP_ADDON_SERVICE_ID = "s-m3";

// Doing someone's makeup ties the artist up for the whole service, not just the
// booked start time — a bridal job (Master or Senior artist, s-m1/s-m2) runs 3.5
// hours, Party Makeup (s-m3) runs 2.5. LuxLash services have no duration modeled
// here, so they're still treated as a single point in time (see getBookingWindow).
const MAKEUP_SERVICE_DURATION_HOURS = { "s-m1": 3.5, "s-m2": 3.5, "s-m3": 2.5 };

const timeToMinutes = (timeStr) => {
  const [h, m] = (timeStr || "").split(":").map(Number);
  return h * 60 + (m || 0);
};

// A booking "occupies" its staff member from appointmentTime for however long the
// service takes — [start, end]. Anything without a known duration (LuxLash, or a
// makeup record with no matching service) collapses to a zero-width point at its
// start time, which still conflicts with an exact-time match but doesn't claim any
// time either side of it.
const getBookingWindow = (c) => {
  const start = timeToMinutes(c.appointmentTime);
  const hours = c.category === "makeup" ? MAKEUP_SERVICE_DURATION_HOURS[c.serviceId] : undefined;
  return { start, end: hours ? start + hours * 60 : start };
};

const windowsOverlap = (a, b) => a.start <= b.end && b.start <= a.end;

const minutesToTime = (mins) =>
  `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

export default function CustomerFormModal({ meta, category, initial, prefill, services, staff, allCustomers, onCancel, onSave, lockContact }) {
  const [form, setForm] = useState(() =>
    initial
      ? { ...initial }
      : prefill
      ? { ...prefill }
      : {
          name: "",
          address: "",
          phone: "",
          email: "",
          instagram: "",
          birthday: "",
          appointmentDate: getTodayISO(),
          appointmentTime: "",
          assignedTo: "",
          serviceId: services[0]?.id || "",
          lashRemoval: false,
          refillId: "",
          discount: 0,
          advance: 0,
          addonIds: [],
          status: "upcoming",
        }
  );
  const locked = !!initial && initial.status === "completed";
  const contactLocked = lockContact || !!prefill;
  const addons = DEFAULT_ADDONS.filter((a) => a.category === category);
  // Lash removal or a refill can be booked on its own — once either is added, the main service is optional.
  const serviceOptional = category === "luxlash" && (form.lashRemoval || !!form.refillId);
  const hasBookableItem = !!form.serviceId || serviceOptional;
  const addonsVisible = category !== "makeup" || form.serviceId === MAKEUP_ADDON_SERVICE_ID;
  const [errors, setErrors] = useState({});

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Full name is required.";
    if (!form.address.trim()) next.address = "Address is required.";
    if (!form.appointmentDate.trim()) next.appointmentDate = "Appointment booked date is required.";
    else if (form.appointmentDate < PROJECT_START_DATE)
      next.appointmentDate = "The studio started in August 2026 — pick a date from then on.";
    if (!form.appointmentTime || !form.appointmentTime.trim()) {
      next.appointmentTime = "Appointment time is required.";
    }
    if (!form.assignedTo || !form.assignedTo.trim()) {
      next.assignedTo = "Assigned staff is required.";
    } else if (form.appointmentTime && form.appointmentDate) {
      // Same staff member, same date, overlapping time window — across every
      // category, not just this one, since a person can't be in two places at
      // once. A makeup booking's window spans its whole service duration (see
      // MAKEUP_SERVICE_DURATION_HOURS); anything else is a single point in time.
      const normalizedAssignee = form.assignedTo.trim().toLowerCase();
      const newWindow = getBookingWindow({ category, serviceId: form.serviceId, appointmentTime: form.appointmentTime });
      const conflictingBooking = (allCustomers || []).find(
        (c) =>
          c.id !== initial?.id &&
          c.status !== "cancelled" &&
          c.appointmentDate === form.appointmentDate &&
          (c.assignedTo || "").trim().toLowerCase() === normalizedAssignee &&
          windowsOverlap(newWindow, getBookingWindow(c))
      );
      if (conflictingBooking) {
        const busyUntil = getBookingWindow(conflictingBooking).end;
        const untilLabel = busyUntil > newWindow.start ? ` (busy until ${formatDisplayTime(minutesToTime(busyUntil))})` : "";
        next.assignedTo = `${form.assignedTo.trim()} is already booked around this time${untilLabel}.`;
      }
    }
    if (!form.serviceId && !serviceOptional) next.serviceId = "Service is required.";
    if (!form.status) next.status = "Status is required.";
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (!phoneDigits) next.phone = "Phone number is required.";
    else if (phoneDigits.length < PHONE_DIGITS_MIN || phoneDigits.length > PHONE_DIGITS_MAX)
      next.phone = `Phone number must be ${PHONE_DIGITS_MIN}–${PHONE_DIGITS_MAX} digits.`;
    return next;
  };

  // Checking lash removal defaults the main service back to "none" — the customer can
  // still pick a service afterward to combine it with lash removal, but the default on
  // first check is removal-only, not whatever service happened to be selected before.
  const handleLashRemovalToggle = (checked) => {
    setForm((f) => ({ ...f, lashRemoval: checked, serviceId: checked ? "" : f.serviceId }));
  };

  // Same rule as lash removal — picking a refill defaults the main service back to
  // "none"; the customer can still pick a service afterward to combine them.
  const handleRefillSelect = (value) => {
    setForm((f) => ({ ...f, refillId: value, serviceId: value ? "" : f.serviceId }));
  };

  const handleServiceSelect = (value) => {
    const addonsStillApply = category !== "makeup" || value === MAKEUP_ADDON_SERVICE_ID;
    setForm((f) => ({ ...f, serviceId: value, discount: 0, addonIds: addonsStillApply ? f.addonIds : [] }));
  };

  const toggleAddon = (id) => {
    setForm((f) => {
      const current = f.addonIds || [];
      const next = current.includes(id) ? current.filter((a) => a !== id) : [...current, id];
      return { ...f, addonIds: next };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    const advance = Number(form.advance) || 0;
    // advanceDate tracks when the advance was actually collected, so revenue lands in the
    // right month even when the appointment itself is scheduled for a later month. It's
    // only (re)stamped with today when the advance amount actually changes — editing
    // something else on an existing appointment shouldn't move its advance's date.
    const previousAdvance = initial ? Number(initial.advance) || 0 : 0;
    const advanceDate =
      advance > 0 && advance !== previousAdvance
        ? getTodayISO()
        : advance > 0
        ? initial?.advanceDate || getTodayISO()
        : undefined;
    onSave({ ...form, discount: Number(form.discount) || 0, advance, advanceDate });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h2>{initial ? `Edit ${meta.label.toLowerCase()} customer` : prefill ? `New appointment` : `Add ${meta.label.toLowerCase()} customer`}</h2>
          <button type="button" className="icon-btn" onClick={onCancel}><X size={18} /></button>
        </div>
        <div className="modal-body">
          {prefill && (
            <div className="notice">
              Rebooking {prefill.name} — this creates a new appointment; their past visit and revenue stay on record.
              Contact details are locked here — update them from the Customers tab.
            </div>
          )}
          {locked && (
            <div className="notice">
              This appointment is completed — only contact details can be edited.
              {category === "luxlash" ? " Use Rebook to schedule a new visit." : ""}
            </div>
          )}
          {lockContact && !prefill && (
            <div className="notice">Editing this appointment — contact details are locked. Update contact info from the Customers tab.</div>
          )}
          <label className="field">
            <span className="label">Full name</span>
            <input
              className={`input${errors.name ? " invalid" : ""}`}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Ankita Paudyl"
              disabled={contactLocked}
            />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label className="field">
            <span className="label">Address</span>
            <input
              className={`input${errors.address ? " invalid" : ""}`}
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Imadol Ga Bi Sa"
              disabled={contactLocked}
            />
            {errors.address && <span className="field-error">{errors.address}</span>}
          </label>
          <label className="field">
            <span className="label">Phone number</span>
            <input
              className={`input${errors.phone ? " invalid" : ""}`}
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="+977-97********"
              disabled={contactLocked}
            />
            {errors.phone && <span className="field-error">{errors.phone}</span>}
          </label>
          <label className="field">
            <span className="label">Email address <span className="label-hint">(optional)</span></span>
            <input
              className="input"
              type="email"
              value={form.email || ""}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="ankitapaudyl@gmail.com"
              disabled={contactLocked}
            />
          </label>
          <label className="field">
            <span className="label">Instagram name <span className="label-hint">(optional)</span></span>
            <input
              className="input"
              value={form.instagram || ""}
              onChange={(e) => setField("instagram", e.target.value)}
              placeholder="@ankitapaudyl"
              disabled={contactLocked}
            />
          </label>
          <label className="field">
            <span className="label">Birthday <span className="label-hint">(optional — shows a reminder on their card)</span></span>
            <input
              type="date"
              className="input"
              value={form.birthday || ""}
              onChange={(e) => setField("birthday", e.target.value)}
              disabled={contactLocked}
            />
          </label>
          <label className="field">
            <span className="label">Appointment booked date</span>
            <input
              type="date"
              className={`input${errors.appointmentDate ? " invalid" : ""}`}
              min={PROJECT_START_DATE}
              value={form.appointmentDate}
              onChange={(e) => setField("appointmentDate", e.target.value)}
              disabled={locked}
            />
            {errors.appointmentDate && <span className="field-error">{errors.appointmentDate}</span>}
          </label>
          <label className="field">
            <span className="label">Assigned time</span>
            <input
              type="time"
              className={`input${errors.appointmentTime ? " invalid" : ""}`}
              value={form.appointmentTime || ""}
              onChange={(e) => setField("appointmentTime", e.target.value)}
              disabled={locked}
            />
            {errors.appointmentTime && <span className="field-error">{errors.appointmentTime}</span>}
          </label>
          <label className="field">
            <span className="label">Assigned to <span className="label-hint">(pick a staff member or type a name)</span></span>
            <input
              className={`input${errors.assignedTo ? " invalid" : ""}`}
              list="assigned-staff-options"
              value={form.assignedTo || ""}
              onChange={(e) => setField("assignedTo", e.target.value)}
              placeholder="Select or type a name"
              disabled={locked}
            />
            <datalist id="assigned-staff-options">
              {(staff || []).map((s) => (<option key={s.id} value={s.name} />))}
            </datalist>
            {errors.assignedTo && <span className="field-error">{errors.assignedTo}</span>}
          </label>
          {category === "luxlash" && (
            <div className="field">
              <span className="label">Lash removal</span>
              <div className="addon-list">
                <label className="addon-option">
                  <input
                    type="checkbox"
                    checked={!!form.lashRemoval}
                    onChange={(e) => handleLashRemovalToggle(e.target.checked)}
                    disabled={locked}
                  />
                  Add lash removal — {formatMoney(LASH_REMOVAL_PRICE)}
                </label>
              </div>
            </div>
          )}

          <label className="field">
            <span className="label">
              Service{" "}
              <span className="label-hint">
                {serviceOptional
                  ? `(optional — ${form.lashRemoval ? "lash removal" : "refill"} already added)`
                  : "(used to calculate revenue)"}
              </span>
            </span>
            <select
              className={`input${errors.serviceId ? " invalid" : ""}`}
              value={form.serviceId}
              onChange={(e) => handleServiceSelect(e.target.value)}
              disabled={locked}
            >
              <option value="" disabled={!serviceOptional}>
                {serviceOptional ? "No other service" : "Select a service"}
              </option>
              {services.map((s) => (<option key={s.id} value={s.id}>{s.name} — {formatMoney(s.price)}</option>))}
            </select>
            {errors.serviceId && <span className="field-error">{errors.serviceId}</span>}
          </label>

          {category === "luxlash" && (
            <label className="field">
              <span className="label">Refill</span>
              <select
                className="input"
                value={form.refillId || ""}
                onChange={(e) => handleRefillSelect(e.target.value)}
                disabled={locked}
              >
                <option value="">No refill</option>
                {["Classic Refill", "Light Volume (2D) Refill", "Wet Lash Refill"].map((group) => (
                  <optgroup key={group} label={group}>
                    {REFILL_OPTIONS.filter((r) => r.group === group).map((r) => (
                      <option key={r.id} value={r.id}>{r.duration} — {formatMoney(r.price)}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </label>
          )}

          {addonsVisible && addons.length > 0 && (
            <div className="field">
              <span className="label">Add-ons</span>
              <div className="addon-list">
                {addons.map((a) => (
                  <label key={a.id} className="addon-option">
                    <input
                      type="checkbox"
                      checked={(form.addonIds || []).includes(a.id)}
                      onChange={() => toggleAddon(a.id)}
                      disabled={locked}
                    />
                    {a.name} — {formatMoney(a.price)}
                  </label>
                ))}
              </div>
            </div>
          )}

          {hasBookableItem && (
            <label className="field">
              <span className="label">Advance <span className="label-hint">(already collected — part of the total, not extra)</span></span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.advance}
                onChange={(e) => setField("advance", e.target.value)}
                placeholder="0.00"
                disabled={locked}
              />
            </label>
          )}

          {form.serviceId && (
            <label className="field">
              <span className="label">Discount</span>
              <input
                className="input"
                type="number"
                step="0.01"
                value={form.discount}
                onChange={(e) => setField("discount", e.target.value)}
                placeholder="0.00"
                disabled={locked}
              />
            </label>
          )}

          <label className="field">
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(e) => setField("status", e.target.value)} disabled={locked}>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn btn-primary" style={{ background: meta.accent }}>{initial ? "Save changes" : prefill ? "Add appointment" : "Add customer"}</button>
        </div>
      </form>
    </div>
  );
}
