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
import { AartiLink } from "@/components/AartiLink";

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
  needs_code?: boolean;
  first_time?: boolean;
  needs_pin_setup?: boolean;
  phone?: string;
  role?: LocalProfile["role"];
  message?: string;
  error?: string;
};

type Step = "phone" | "code" | "setpin";

const inputClass =
  "mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2 text-base tracking-widest";

/** Verified phone cookie decides software / guru / चरणसेवक screens. Staff: last-4 once, then PIN. */
export function PhoneGate({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPin2, setNewPin2] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [firstTime, setFirstTime] = useState(false);
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
    if (profile.role === "software" && pathname.startsWith("/weekly")) {
      router.replace("/attendance");
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

  function resetToPhone() {
    setStep("phone");
    setCode("");
    setNewPin("");
    setNewPin2("");
    setFirstTime(false);
    setHint(null);
    setError(null);
  }

  async function bindPhone(opts: { phone: string; code?: string; newPin?: string }) {
    setBusy(true);
    setError(null);
    setHint(null);
    try {
      const res = await fetch("/api/auth/actor", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: opts.phone, code: opts.code, new_pin: opts.newPin }),
      });
      const data = (await res.json().catch(() => ({}))) as BindResponse;
      if (!res.ok) {
        setError(data.error || "मोबाइल जोडता आला नाही");
        return;
      }
      if (data.needs_pin_setup) {
        setStep("setpin");
        setHint(data.message || "नवा पिन तयार करा");
        return;
      }
      if (data.needs_code) {
        setStep("code");
        setFirstTime(Boolean(data.first_time));
        setHint(data.message || "पिन टाका");
        return;
      }
      const next = saveProfile({ phone: opts.phone });
      setProfile(next);
      setServerBound(true);
      resetToPhone();
      router.replace(defaultHomePath(next.role));
    } catch {
      setError("नेटवर्क त्रुटी");
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (phone.replace(/\D/g, "").length < 10) {
      setError("१० अंकी मोबाइल टाका");
      return;
    }
    if (step === "phone") {
      void bindPhone({ phone });
      return;
    }
    if (step === "code") {
      if (code.length < 4) {
        setError(firstTime ? "शेवटचे ४ अंक टाका" : "पिन टाका");
        return;
      }
      void bindPhone({ phone, code });
      return;
    }
    if (newPin.length < 4 || newPin.length > 6) {
      setError("पिन ४ ते ६ अंकी हवा");
      return;
    }
    if (newPin !== newPin2) {
      setError("दोन्ही पिन सारखे नाहीत");
      return;
    }
    void bindPhone({ phone, code, newPin });
  }

  if (!ready) {
    return <p className="p-4 text-sm text-temple-muted">लोड…</p>;
  }

  if (!profile || !serverBound) {
    const submitLabel = busy
      ? "कृपया थांबा…"
      : step === "phone"
        ? "सुरू करा"
        : step === "code"
          ? firstTime
            ? "पुढे"
            : "पिन खात्री करा"
          : "पिन जतन करा";
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <div className="text-center">
          <p className="text-sm font-semibold text-saffron-700">परमानंद धाम</p>
          <h1 className="font-display text-3xl text-saffron-900">मोबाइल खात्री</h1>
          <p className="mt-2 text-sm text-temple-muted">
            संगणक / मार्गदर्शक: पहिल्यांदा मोबाइलचे शेवटचे ४ अंक, नंतर तुमचा पिन. चरणसेवक थेट जोडता येईल.
          </p>
        </div>
        <form
          className="card space-y-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="block text-sm font-semibold">
            मोबाइल
            <input
              type="tel"
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2 text-base"
              placeholder="१० अंकी मोबाइल"
              value={phone}
              disabled={step !== "phone" || busy}
              onChange={(ev) => setPhone(ev.target.value)}
            />
          </label>
          {step === "code" ? (
            <label className="block text-sm font-semibold">
              {firstTime ? "मोबाइलचे शेवटचे ४ अंक" : "तुमचा पिन"}
              <input
                type="password"
                inputMode="numeric"
                autoComplete={firstTime ? "off" : "current-password"}
                className={inputClass}
                placeholder={firstTime ? "४ अंक" : "४–६ अंकी पिन"}
                value={code}
                disabled={busy}
                autoFocus
                onChange={(ev) => setCode(ev.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
          ) : null}
          {step === "setpin" ? (
            <>
              <label className="block text-sm font-semibold">
                नवा पिन (४ ते ६ अंक)
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="नवा पिन"
                  value={newPin}
                  disabled={busy}
                  autoFocus
                  onChange={(ev) => setNewPin(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </label>
              <label className="block text-sm font-semibold">
                पिन पुन्हा टाका
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="पुन्हा तोच पिन"
                  value={newPin2}
                  disabled={busy}
                  onChange={(ev) => setNewPin2(ev.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </label>
              <p className="text-xs text-temple-muted">
                हा पिन लक्षात ठेवा — पुढच्या वेळी याच पिनने लॉगिन होईल.
              </p>
            </>
          ) : null}
          {step === "phone" ? (
            <p className="text-xs text-temple-muted">
              अधिकार असलेले नंबर यादीत दाखवत नाही — फक्त तुमचा मोबाइल टाका.
            </p>
          ) : null}
          {hint ? <p className="text-sm text-saffron-800">{hint}</p> : null}
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-saffron-700 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitLabel}
          </button>
          {step !== "phone" ? (
            <button
              type="button"
              className="w-full text-sm text-temple-muted underline"
              disabled={busy}
              onClick={resetToPhone}
            >
              मोबाइल बदला
            </button>
          ) : null}
        </form>
        <p className="text-center text-sm">
          <AartiLink className="font-semibold text-saffron-800 underline-offset-2 hover:underline" />
        </p>
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
