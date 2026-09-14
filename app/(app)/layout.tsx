import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { PhoneGate } from "@/components/PhoneGate";
import { ManifestSwitcher } from "@/components/ManifestSwitcher";
import { SESSION_COOKIE, isSessionToken } from "@/lib/auth";

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!isSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    redirect("/login");
  }
  return (
    <PhoneGate>
      <div className="mx-auto min-h-dvh max-w-lg pb-24">
        <ManifestSwitcher />
        <AppHeader subtitle="गुरुवार रात्री ८:०० · नोंदी व अहवाल" />
        <main className="px-4 py-4">{children}</main>
        <BottomNav />
      </div>
    </PhoneGate>
  );
}
