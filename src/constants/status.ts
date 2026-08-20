import type { AppointmentStatus } from "../types/index.js";

export interface StatusMeta {
  label: string;
  chip: string;
  text: string;
}

export const STATUS: Record<AppointmentStatus, StatusMeta> = {
  upcoming: { label: "Upcoming", chip: "#F3E3E8", text: "#8A3050" },
  completed: { label: "Completed", chip: "#E1EEE7", text: "#276148" },
  cancelled: { label: "Cancelled", chip: "#F5E6E1", text: "#B3452F" },
};
