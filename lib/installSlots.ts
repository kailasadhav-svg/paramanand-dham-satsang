import type { StaffRole } from "@/lib/roles";

/** Three Home Screen apps ordinary users can install. */
export type InstallSlot = "software" | "samvadak" | "charansevak";

export const INSTALL_SLOTS: Record<
  InstallSlot,
  {
    phone: string;
    role: StaffRole;
    shortName: string;
    name: string;
    forWhom: string;
    manifest: string;
    icon: string;
    appleIcon: string;
    theme: string;
    /** Deep-link role key used by /t/[role]. */
    testRole: string;
  }
> = {
  software: {
    phone: "9225118811",
    role: "software",
    shortName: "संगणक",
    name: "संगणक चरणसेवक",
    forWhom: "कैलास · GPS · अहवाल · उपस्थिती",
    manifest: "/manifests/software.webmanifest",
    icon: "/icons/software/icon-192.png",
    appleIcon: "/icons/software/apple-touch-icon.png",
    theme: "#9a3412",
    testRole: "software",
  },
  samvadak: {
    phone: "9850120960",
    role: "guru",
    shortName: "मार्गदर्शक",
    name: "मार्गदर्शक चरणसेवक",
    forWhom: "मधुसुदनदास · विषय · चिंतन · मंजुरी · संवाद",
    manifest: "/manifests/samvadak.webmanifest",
    icon: "/icons/samvadak/icon-192.png",
    appleIcon: "/icons/samvadak/apple-touch-icon.png",
    theme: "#c74407",
    testRole: "guru",
  },
  charansevak: {
    phone: "9423078811",
    role: "charansevak",
    shortName: "चरणसेवक",
    name: "परमानंद चरणसेवक",
    forWhom: "परमानंद चरणसेवक · फक्त स्वतःचे काम",
    manifest: "/manifests/charansevak.webmanifest",
    icon: "/icons/charansevak/icon-192.png",
    appleIcon: "/icons/charansevak/apple-touch-icon.png",
    theme: "#7c2d12",
    testRole: "charansevak",
  },
};

export function isInstallSlot(value: string): value is InstallSlot {
  return value === "software" || value === "samvadak" || value === "charansevak";
}
