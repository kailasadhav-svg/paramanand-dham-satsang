import { CHINTAN_LABEL } from "./labels.ts";
import { canSeeStaffScreens, type StaffRole } from "./roles.ts";

export type BottomNavItemDef = {
  href: string;
  label: string;
  /** GPS/report staff tools — संगणक + मार्गदर्शक. */
  staffOnly?: boolean;
  /** Village प्रश्नोत्तर ask window — hidden for मार्गदर्शक. */
  hideForGuru?: boolean;
  /** चिंतन roster / bodies — मार्गदर्शक bottom nav. */
  guruOnly?: boolean;
};

export const BOTTOM_NAV_DEFS: BottomNavItemDef[] = [
  { href: "/attendance", label: "उपस्थिती" },
  { href: "/topic", label: "विषय" },
  { href: "/weekly", label: CHINTAN_LABEL, guruOnly: true },
  { href: "/questions", label: "प्रश्न", hideForGuru: true },
  { href: "/ajapa", label: "संवाद" },
  { href: "/report", label: "अहवाल", staffOnly: true },
];

/** Bottom tabs for a bound actor. मार्गदर्शक get चिंतन instead of प्रश्न. */
export function visibleBottomNavItems(
  role: StaffRole | null,
): BottomNavItemDef[] {
  const staff = role ? canSeeStaffScreens(role) : false;
  return BOTTOM_NAV_DEFS.filter((item) => {
    if (item.staffOnly && !staff) return false;
    if (item.guruOnly && role !== "guru") return false;
    if (item.hideForGuru && role === "guru") return false;
    return true;
  });
}
