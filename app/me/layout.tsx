import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MEMBER_COOKIE, parseMemberSessionToken } from "@/lib/auth";
import { MemberHeader } from "@/components/MemberHeader";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  if (!parseMemberSessionToken(jar.get(MEMBER_COOKIE)?.value)) {
    redirect("/member-login");
  }
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-10">
      <MemberHeader />
      <main className="px-4 py-4">{children}</main>
    </div>
  );
}
