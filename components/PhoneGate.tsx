"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearProfile,
  loadProfile,
  profileAppName,
  saveProfile,
  type LocalProfile,
} from "@/lib/offline/profile";
import { displayPhone } from "@/lib/offline/phone";
import { defaultHomePath, roleLabelMarathi } from "@/lib/roles";

type CtxValue = { profile: LocalProfile; clear: () => void };

const Ctx = createContext<CtxValue | null>(null);

export function useProfile(): LocalProfile {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile outside PhoneGate");
  return ctx.profile;
}

export function useProfileOptional(): LocalProfile | null {
  return useContext(Ctx)?.profile ?? null;
}

export function useClearProfile(): () => void {
  return useContext(Ctx)?.clear ?? (() => undefined);
}

type BindResponse = {
  ok?: boolean;
  needs_otp?: boolean;
  phone?: string;
  role?: LocalProfile["role"];
  message?: string;
  error?: string;
  debug_otp?: string;
};

/** After PIN login — verified phone cookie decides software / guru / चरणसेवक screens. */
export function PhoneGate({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [serverBound, setServerBound] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadProfile();
      try {
        const res = await fetch("/api/auth/actor", { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          phone?: string | null;
          role?: LocalProfile["role"];
        };
        if (!cancelled && res.ok && data.phone) {
          const next = saveProfile({ phone: data.phone });
          setProfile(next);
          setServerBound(true);
          setReady(true);
          return;
        }
      } catch {
        // fall through to local gate
      }
      if (!cancelled) {
        // Local profile alone is not enough — must re-bind to server cookie.
        if (local) clearProfile();
        setProfile(null);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || !profile) return;
    if (
      profile.role === "charansevak" &&
      ["/report", "/members"].some((p) => pathname.startsWith(p))
    ) {
      router.replace("/ajapa");
    }
  }, [ready, profile, pathname, router]);

  useEffect(() => {
    if (!profile) return;
    const name = profileAppName(profile);
    document.title = name;
    let meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "apple-mobile-web-app-title");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", name);
  }, [profile]);

  async function bindPhone(opts: { phone: string; otp?: string }) {
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch("/api/auth/actor", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: opts.phone, otp: opts.otp }),
      });
      const data = (await res.json().catch(() => ({}))) as BindResponse;
      if (!res.ok) {
        setError(data.error || "मोबाइल जोडता आला नाही");
        return;
      }
      if (data.needs_otp) {
        setNeedsOtp(true);
        setHint(data.message || "WhatsApp OTP टाका");
        if (data.debug_otp) setOtp(data.debug_otp);
        return;
      }
      const next = saveProfile({ phone: opts.phone });
      setProfile(next);
      setServerBound(true);
      setNeedsOtp(false);
      router.replace(defaultHomePath(next.role));
    } catch {
      setError("नेटवर्क त्रुटी");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return <p className="p-4 text-sm text-temple-muted">लोड…</p>;
  }

  if (!profile || !serverBound) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <div className="text-center">
          <p className="text-sm font-semibold text-saffron-700">परमानंद धाम</p>
          <h1 className="font-display text-3xl text-saffron-900">मोबाइल खात्री</h1>
          <p className="mt-2 text-sm text-temple-muted">
            सेवक / संवादक मोबाइलसाठी WhatsApp OTP लागेल. चरणसेवक थेट जोडता येईल.
          </p>
        </div>
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (phone.replace(/\D/g, "").length < 10) {
              setError("१० अंकी मोबाइल टाका");
              return;
            }
            if (needsOtp) {
              void bindPhone({ phone, otp });
            } else {
              void bindPhone({ phone });
            }
          }}
        >
          <label className="block text-sm font-semibold">
            WhatsApp मोबाइल
            <input
              type="tel"
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2 text-base"
              placeholder="१० अंकी मोबाइल"
              value={phone}
              disabled={needsOtp || busy}
              onChange={(ev) => setPhone(ev.target.value)}
            />
          </label>
          {needsOtp ? (
            <label className="block text-sm font-semibold">
              WhatsApp OTP
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2 text-base tracking-widest"
                placeholder="६ अंकी कोड"
                value={otp}
                disabled={busy}
                onChange={(ev) => setOtp(ev.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
          ) : null}
          <p className="text-xs text-temple-muted">
            अधिकार असलेले नंबर यादीत दाखवत नाही — फक्त तुमचा WhatsApp मोबाइल टाका.
          </p>
          {hint ? <p className="text-sm text-saffron-800">{hint}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-saffron-700 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? "कृपया थांबा…" : needsOtp ? "OTP खात्री करा" : "सुरू करा"}
          </button>
          {needsOtp ? (
            <button
              type="button"
              className="w-full text-sm text-temple-muted underline"
              disabled={busy}
              onClick={() => {
                setNeedsOtp(false);
                setOtp("");
                setHint(null);
              }}
            >
              मोबाइल बदला
            </button>
          ) : null}
        </form>
      </div>
    );
  }

  return (
    <Ctx.Provider
      value={{
        profile,
        clear: () => {
          void fetch("/api/auth/actor", { method: "DELETE", credentials: "include" });
          clearProfile();
          setProfile(null);
          setServerBound(false);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function ProfileChip() {
  const profile = useProfileOptional();
  if (!profile) return null;
  return (
    <p className="text-[11px] text-temple-muted">
      {roleLabelMarathi(profile.role)} · {displayPhone(profile.phone)}
    </p>
  );
}
