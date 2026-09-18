"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProfileChip, useClearProfile, useProfileOptional } from "@/components/PhoneGate";
import { profileAppName } from "@/lib/offline/profile";
import { canSeeStaffScreens } from "@/lib/roles";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  const router = useRouter();
  const profile = useProfileOptional();
  const clearProfile = useClearProfile();
  const title = profileAppName(profile);

  async function logout() {
    clearProfile();
    await fetch("/api/auth/logout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "admin" }),
    });
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-saffron-200/70 bg-white/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-start justify-between gap-3 md:max-w-3xl">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-saffron-700">परमानंद धाम</p>
          <h1 className="font-display break-words text-2xl leading-tight text-saffron-900">
            {title}
          </h1>
          <ProfileChip />
          {subtitle && profile && profile.role !== "charansevak" ? (
            <p className="mt-0.5 break-words text-sm text-temple-muted">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-saffron-200 px-3 py-1.5 text-xs font-semibold text-saffron-800"
          >
            बाहेर पडा
          </button>
          {profile ? (
            <nav className="flex gap-2 text-[11px] font-semibold text-saffron-800">
              {profile && canSeeStaffScreens(profile.role) ? (
                <Link href="/members">चरणसेवक</Link>
              ) : null}
              {profile.role !== "software" ? (
                <Link href="/weekly">चिंतन</Link>
              ) : null}
            </nav>
          ) : null}
          {profile ? (
            <button
              type="button"
              onClick={() => {
                clearProfile();
                router.refresh();
              }}
              className="text-[11px] font-semibold text-temple-muted underline"
            >
              मोबाइल बदला
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
