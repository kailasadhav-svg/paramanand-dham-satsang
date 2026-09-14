import { NextResponse } from "next/server";
import { requireApiSession } from "@/lib/api-guard";
import { countLoginCollisions, listMembers, publicMember } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Registered चरणसेवक members (login-code system from main). */
export async function GET(request: Request) {
  const auth = await requireApiSession();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const collisionsOnly = searchParams.get("collisions") === "1";
  const members = await listMembers({ collisionsOnly });
  return NextResponse.json({
    members: members.map(publicMember),
    collision_count: await countLoginCollisions(),
  });
}
