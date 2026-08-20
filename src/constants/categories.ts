import { Sparkles, Eye, type LucideIcon } from "lucide-react";
import type { Category, CategoryMeta } from "../types/index.js";

interface CategoryMetaWithIcon extends CategoryMeta {
  icon: LucideIcon;
}

export const CATEGORY: Record<Category, CategoryMetaWithIcon> = {
  makeup: { label: "Makeup", accent: "var(--makeup)", tint: "var(--makeup-tint)", text: "var(--makeup-dark)", icon: Sparkles },
  luxlash: { label: "LuxLash", accent: "var(--luxlash)", tint: "var(--luxlash-tint)", text: "var(--luxlash-dark)", icon: Eye },
};
