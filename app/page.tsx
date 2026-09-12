import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, isSessionToken } from "@/lib/auth";

export default async function HomePage() {
  const jar = await cookies();
  if (isSessionToken(jar.get(SESSION_COOKIE)?.value)) {
    redirect("/attendance");
  }
  redirect("/login");
}
