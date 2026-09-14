"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clearProfile, saveProfile } from "@/lib/offline/profile";
import { defaultHomePath, detectStaffRole } from "@/lib/roles";

/** One-tap test entry: sets phone role then opens PIN login. */
const ROLE_PHONES: Record<string, { phone: string; label: string }> = {
  guru: { phone: "9850120960", label: "गुरु · मधुसुदनदास" },
  software: { phone: "9225118811", label: "सॉफ्टवेअर · कैलास" },
  charansevak: { phone: "9423078811", label: "चरणसेवक · कैलास" },
  madhu: { phone: "9136443333", label: "चरणसेवक · मधुसुदनदास" },
};

export default function TestRolePage() {
  const params = useParams<{ role: string }>();
  const router = useRouter();
  const [msg, setMsg] = useState("तयार होत आहे…");

  useEffect(() => {
    const key = String(params.role || "").toLowerCase();
    const cfg = ROLE_PHONES[key];
    if (!cfg) {
      setMsg("अज्ञात लिंक — /t/guru | /t/software | /t/charansevak");
      return;
    }
    clearProfile();
    saveProfile({ phone: cfg.phone });
    const role = detectStaffRole(cfg.phone);
    setMsg(`${cfg.label} · ${cfg.phone}`);
    const home = defaultHomePath(role);
    router.replace(`/login?next=${encodeURIComponent(home)}&role=${key}`);
  }, [params.role, router]);

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-sm font-semibold text-saffron-700">टेस्ट लिंक</p>
      <p className="font-display text-2xl text-saffron-900">{msg}</p>
      <p className="text-xs text-temple-muted">PIN 1960 · नंतर थेट अ‍ॅप</p>
    </div>
  );
}
