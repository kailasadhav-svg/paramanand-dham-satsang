import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  MEMBER_COOKIE,
  SESSION_COOKIE,
  isSessionToken,
  parseActorSessionToken,
  parseMemberSessionToken,
  ACTOR_COOKIE,
} from "@/lib/auth";
import { defaultHomePath, detectStaffRole } from "@/lib/roles";

export default async function HomePage() {
  const jar = await cookies();
  if (isSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    const actor = parseActorSessionToken(jar.get(ACTOR_COOKIE)?.value);
    if (actor) {
      redirect(defaultHomePath(detectStaffRole(actor)));
    }
    redirect("/attendance");
  }
  if (parseMemberSessionToken(jar.get(MEMBER_COOKIE)?.value)) {
    redirect("/me");
  }
  redirect("/login");
}
