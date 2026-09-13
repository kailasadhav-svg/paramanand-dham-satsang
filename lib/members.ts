import type { Row } from "@libsql/client";
import { getDb } from "./db";
import { allocateLoginCode, normalizeMobile } from "./login-code";
import { isPlaceCode, placeLabel, type PlaceCode } from "./places";

export type Member = {
  id: number;
  name: string;
  mobile: string;
  place_code: PlaceCode;
  place_label: string;
  login_code: string;
  login_code_collision: boolean;
  created_at: string;
};

export class MemberError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function num(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function str(value: unknown): string {
  return value == null ? "" : String(value);
}

function asMember(row: Row): Member {
  const place_code = str(row.place_code);
  return {
    id: num(row.id),
    name: str(row.name),
    mobile: str(row.mobile),
    place_code: (isPlaceCode(place_code) ? place_code : place_code) as PlaceCode,
    place_label: placeLabel(place_code),
    login_code: str(row.login_code),
    login_code_collision: num(row.login_code_collision) === 1,
    created_at: str(row.created_at),
  };
}

export function publicMember(m: Member) {
  return {
    id: m.id,
    name: m.name,
    mobile: m.mobile,
    place_code: m.place_code,
    place_label: m.place_label,
    login_code: m.login_code,
    login_code_collision: m.login_code_collision,
    created_at: m.created_at,
  };
}

export async function getMemberById(id: number): Promise<Member | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM members WHERE id = ?",
    args: [id],
  });
  return rs.rows[0] ? asMember(rs.rows[0]) : undefined;
}

export async function getMemberByMobile(mobile: string): Promise<Member | undefined> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT * FROM members WHERE mobile = ?",
    args: [mobile],
  });
  return rs.rows[0] ? asMember(rs.rows[0]) : undefined;
}

async function loginCodeTaken(code: string): Promise<boolean> {
  const db = await getDb();
  const rs = await db.execute({
    sql: "SELECT 1 AS ok FROM members WHERE login_code = ? LIMIT 1",
    args: [code],
  });
  return rs.rows.length > 0;
}

function normalizeName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

export async function registerMember(input: {
  name: string;
  mobile: string;
  place_code: string;
}): Promise<Member> {
  const name = normalizeName(input.name ?? "");
  if (!name) throw new MemberError("नाव लिहा (२–८० अक्षरे)", 400);
  const mobile = normalizeMobile(input.mobile ?? "");
  if (!mobile) throw new MemberError("१० अंकी भारतीय मोबाइल लिहा", 400);
  if (!isPlaceCode(input.place_code)) throw new MemberError("स्थान निवडा", 400);

  const existing = await getMemberByMobile(mobile);
  if (existing) throw new MemberError("हा मोबाइल आधी नोंदला आहे", 409);

  const allocated = await allocateLoginCode(mobile, loginCodeTaken);
  const created_at = new Date().toISOString();
  const db = await getDb();

  try {
    const result = await db.execute({
      sql: `INSERT INTO members (name, mobile, place_code, login_code, login_code_collision, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        name,
        mobile,
        input.place_code,
        allocated.login_code,
        allocated.collision ? 1 : 0,
        created_at,
      ],
    });
    const id = Number(result.lastInsertRowid);
    const saved = await getMemberById(id);
    if (!saved) throw new MemberError("अजपा अयशस्वी", 500);
    return saved;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (/UNIQUE|unique/i.test(message)) {
      if (await getMemberByMobile(mobile)) {
        throw new MemberError("हा मोबाइल आधी नोंदला आहे", 409);
      }
      const retry = await allocateLoginCode(mobile, loginCodeTaken);
      const result = await db.execute({
        sql: `INSERT INTO members (name, mobile, place_code, login_code, login_code_collision, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        args: [name, mobile, input.place_code, retry.login_code, 1, created_at],
      });
      const id = Number(result.lastInsertRowid);
      const saved = await getMemberById(id);
      if (!saved) throw new MemberError("अजपा अयशस्वी", 500);
      return saved;
    }
    throw err;
  }
}

export async function verifyMemberLogin(mobileRaw: string, codeRaw: string): Promise<Member | undefined> {
  const mobile = normalizeMobile(mobileRaw ?? "");
  const login_code = String(codeRaw ?? "").trim();
  if (!mobile || !login_code) return undefined;
  const member = await getMemberByMobile(mobile);
  if (!member) return undefined;
  const a = Buffer.from(member.login_code);
  const b = Buffer.from(login_code);
  if (a.length !== b.length) return undefined;
  const { timingSafeEqual } = await import("crypto");
  if (!timingSafeEqual(a, b)) return undefined;
  return member;
}

export async function listMembers(opts?: { collisionsOnly?: boolean }): Promise<Member[]> {
  const db = await getDb();
  const rs = await db.execute({
    sql: opts?.collisionsOnly
      ? "SELECT * FROM members WHERE login_code_collision = 1 ORDER BY id"
      : "SELECT * FROM members ORDER BY id",
    args: [],
  });
  return rs.rows.map(asMember);
}

export async function countLoginCollisions(): Promise<number> {
  const db = await getDb();
  const rs = await db.execute("SELECT COUNT(*) AS n FROM members WHERE login_code_collision = 1");
  return num(rs.rows[0]?.n);
}
