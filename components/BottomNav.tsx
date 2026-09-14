"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useProfileOptional } from "@/components/PhoneGate";
import { canSeeStaffScreens } from "@/lib/roles";

type NavItem = {
  href: string;
  label: string;
  icon: (p: { active: boolean }) => React.ReactNode;
  staffOnly?: boolean;
};

const ITEMS: NavItem[] = [
  { href: "/attendance", label: "उपस्थिती", icon: UsersIcon, staffOnly: true },
  { href: "/topic", label: "विषय", icon: BookIcon, staffOnly: true },
  { href: "/questions", label: "प्रश्न", icon: QuestionIcon, staffOnly: true },
  { href: "/ajapa", label: "संवाद", icon: AjapaIcon },
  { href: "/report", label: "अहवाल", icon: ReportIcon, staffOnly: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const profile = useProfileOptional();
  const staff = profile ? canSeeStaffScreens(profile.role) : false;
  const items = ITEMS.filter((i) => (i.staffOnly ? staff : true));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-saffron-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className={`mx-auto grid max-w-lg ${staff ? "grid-cols-5" : "grid-cols-1"}`}>
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[13px] font-semibold ${
                  active ? "text-saffron-700" : "text-temple-muted"
                }`}
              >
                <Icon active={active} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function UsersIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#c74407" : "#7a5a42"} strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3 3 0 0 1 0 5.74" />
    </svg>
  );
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#c74407" : "#7a5a42"} strokeWidth="1.8">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
    </svg>
  );
}

function QuestionIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#c74407" : "#7a5a42"} strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1.5 1-1.5 1.9V14" />
      <circle cx="12" cy="17" r="0.7" fill={active ? "#c74407" : "#7a5a42"} />
    </svg>
  );
}

function ReportIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#c74407" : "#7a5a42"} strokeWidth="1.8">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8M8 17h5" />
    </svg>
  );
}

function AjapaIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#c74407" : "#7a5a42"} strokeWidth="1.8">
      <path d="M12 3v18" />
      <path d="M5 8h14" />
      <path d="M7 8c0 4 2.5 8 5 11" />
      <path d="M17 8c0 4-2.5 8-5 11" />
    </svg>
  );
}
