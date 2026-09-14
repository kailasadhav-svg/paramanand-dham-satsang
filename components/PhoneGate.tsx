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

/** After PIN login — phone decides software / guru / चरणसेवक screens. */
export function PhoneGate({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !profile) return;
    // चरणसेवक / सत्संगी: प्रश्न / अहवाल बंद; विषय सर्वांना (वाचण्यासाठी)
    if (
      (profile.role === "charansevak" || profile.role === "satsangi") &&
      ["/questions", "/report"].some((p) => pathname.startsWith(p))
    ) {
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

  if (!ready) {
    return <p className="p-4 text-sm text-temple-muted">लोड…</p>;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
        <div className="text-center">
          <p className="text-sm font-semibold text-saffron-700">परमानंद धाम</p>
          <h1 className="font-display text-3xl text-saffron-900">मोबाइल निवडा</h1>
          <p className="mt-2 text-sm text-temple-muted">
            क्रमांकानुसार स्क्रीन — संचालक / संवादक / चरणसेवक / सत्संगी
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
            const next = saveProfile({ phone });
            setProfile(next);
            setError(null);
            router.replace(defaultHomePath(next.role));
          }}
        >
          <label className="block text-sm font-semibold">
            WhatsApp मोबाइल
            <input
              type="tel"
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-saffron-200 px-3 py-2 text-base"
              placeholder="9225118811"
              value={phone}
              onChange={(ev) => setPhone(ev.target.value)}
            />
          </label>
          <ul className="space-y-1 text-xs text-temple-muted">
            <li>
              · <strong>9225118811</strong> — संचालक (कैलास · सर्व स्क्रीन)
            </li>
            <li>
              · <strong>9850120960</strong> — संवादक (उपस्थिती · अहवाल · संवाद)
            </li>
            <li>
              · <strong>9423078811</strong> / <strong>9136443333</strong> — चरणसेवक (नेमणूक)
            </li>
            <li>· इतर मोबाइल — सत्संगी चरणसेवक (स्वतःची उपस्थिती)</li>
          </ul>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-full bg-saffron-700 py-2.5 text-sm font-semibold text-white"
          >
            सुरू करा
          </button>
        </form>
      </div>
    );
  }

  return (
    <Ctx.Provider
      value={{
        profile,
        clear: () => {
          clearProfile();
          setProfile(null);
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
