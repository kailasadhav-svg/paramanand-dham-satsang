"use client";

import { useEffect } from "react";
import { useProfileOptional } from "@/components/PhoneGate";
import { INSTALL_SLOTS, type InstallSlot } from "@/lib/installSlots";

function slotForRole(role: string | undefined): InstallSlot {
  if (role === "software") return "software";
  if (role === "charansevak") return "charansevak";
  return "samvadak";
}

/** Swap web app manifest so Add to Home Screen gets the right name/icon. */
export function ManifestSwitcher() {
  const profile = useProfileOptional();

  useEffect(() => {
    const slot = slotForRole(profile?.role);
    const cfg = INSTALL_SLOTS[slot];
    const href = cfg.manifest;

    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = href;

    let apple = document.querySelector(
      'link[rel="apple-touch-icon"]',
    ) as HTMLLinkElement | null;
    if (!apple) {
      apple = document.createElement("link");
      apple.rel = "apple-touch-icon";
      document.head.appendChild(apple);
    }
    apple.href = cfg.appleIcon;

    let title = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (!title) {
      title = document.createElement("meta");
      title.setAttribute("name", "apple-mobile-web-app-title");
      document.head.appendChild(title);
    }
    title.setAttribute("content", cfg.shortName);
  }, [profile?.role]);

  return null;
}
