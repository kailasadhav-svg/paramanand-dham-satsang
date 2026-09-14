"use client";

import { useEffect } from "react";
import { useProfileOptional } from "@/components/PhoneGate";

/** Swap web app manifest so Add to Home Screen gets the right name. */
export function ManifestSwitcher() {
  const profile = useProfileOptional();

  useEffect(() => {
    const href =
      profile?.role === "charansevak"
        ? "/manifest-charansevak.webmanifest"
        : "/manifest.webmanifest";

    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [profile?.role]);

  return null;
}
