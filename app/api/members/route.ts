import { NextResponse } from "next/server";
import { requireStaffActor, routeErrorResponse } from "@/lib/api-guard";
import { countLoginCollisions, listMembers, publicMember } from "@/lib/members";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Registered चरणसेवक members (login-code system from main). Staff only. */
export async function GET(request: Request) {
  const auth = await requireStaffActor();
  if (!auth.ok) return auth.response;
  const { searchParams } = new URL(request.url);
  const collisionsOnly = searchParams.get("collisions") === "1";
  try {
    const members = await listMembers({ collisionsOnly });
    return NextResponse.json({
      members: members.map(publicMember),
      collision_count: await countLoginCollisions(),
    });
  } catch (err) {
    return routeErrorResponse(err, "यादी लोड अयशस्वी");
  }
}
