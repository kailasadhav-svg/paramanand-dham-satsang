"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type MemberRow = {
  id: number;
  name: string;
  mobile: string;
  place_label: string;
  login_code: string;
  login_code_collision: boolean;
  created_at: string;
};

export default function MembersAdminPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [collisionCount, setCollisionCount] = useState(0);
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = onlyFlagged ? "?collisions=1" : "";
    void api<{ members: MemberRow[]; collision_count: number }>(`/api/members${q}`)
      .then((data) => {
        setMembers(data.members);
        setCollisionCount(data.collision_count);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "लोड अयशस्वी"));
  }, [onlyFlagged]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">चरणसेवक</h2>
      <p className="text-sm text-temple-muted">
        ६-अंकी संकेत (टक्कर): <span className="font-bold text-saffron-800">{collisionCount}</span>
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={onlyFlagged} onChange={(e) => setOnlyFlagged(e.target.checked)} />
        फक्त टक्कर झालेले
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.id} className="card p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-semibold">
                #{m.id} {m.name}
              </p>
              {m.login_code_collision ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                  ६-अंकी संकेत
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-temple-muted">
              {m.place_label} · {m.mobile}
            </p>
            <p className="mt-1 text-sm">
              संकेत: <span className="font-bold tracking-widest">{m.login_code}</span>
            </p>
          </li>
        ))}
      </ul>
      {members.length === 0 ? (
        <p className="text-center text-sm text-temple-muted">अद्याप नोंद नाही</p>
      ) : null}
    </div>
  );
}
