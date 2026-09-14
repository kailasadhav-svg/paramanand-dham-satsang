import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-guard";
import { MemberError, publicMember, registerMember } from "@/lib/members";
import { PLACE_OPTIONS } from "@/lib/places";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ places: PLACE_OPTIONS });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    mobile?: string;
    place_code?: string;
  };
  try {
    const member = await registerMember({
      name: body.name ?? "",
      mobile: body.mobile ?? "",
      place_code: body.place_code ?? "",
    });
    return NextResponse.json({ member: publicMember(member) }, { status: 201 });
  } catch (err) {
    if (err instanceof MemberError) return jsonError(err.message, err.status);
    throw err;
  }
}
