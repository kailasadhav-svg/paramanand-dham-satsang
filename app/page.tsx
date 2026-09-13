import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MEMBER_COOKIE, SESSION_COOKIE, isSessionToken, parseMemberSessionToken } from "@/lib/auth";

export default async function HomePage() {
  const jar = await cookies();
  if (isSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    redirect("/attendance");
  }
  if (parseMemberSessionToken(jar.get(MEMBER_COOKIE)?.value)) {
    redirect("/me");
  }
  redirect("/login");
}
