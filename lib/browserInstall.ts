"use client";

export type BrowserKind =
  | "ios-safari"
  | "ios-other"
  | "android-chrome"
  | "android-samsung"
  | "android-other"
  | "desktop"
  | "unknown";

export type InstallGuide = {
  kind: BrowserKind;
  /** Short label shown to user, e.g. "Chrome (Android)" */
  browserLabel: string;
  title: string;
  steps: string[];
  /** Extra tip under steps */
  tip?: string;
  /** Whether Chrome-style Install prompt can appear */
  canNativeInstall: boolean;
};

function detectKind(): BrowserKind {
  if (typeof window === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isChrome = /chrome|crios|chromium/i.test(ua) && !/edg|opr|samsung/i.test(ua);
  const isSamsung = /samsungbrowser/i.test(ua);
  const isSafari =
    /safari/i.test(ua) && !/crios|fxios|edgios|chrome|chromium|android/i.test(ua);

  if (isIos) {
    // iOS Chrome/Firefox/Edge cannot Add to Home Screen the same way
    if (isSafari) return "ios-safari";
    return "ios-other";
  }
  if (isAndroid) {
    if (isSamsung) return "android-samsung";
    if (isChrome) return "android-chrome";
    return "android-other";
  }
  if (/macintosh|windows|linux/i.test(ua)) return "desktop";
  return "unknown";
}

export function getInstallGuide(kind: BrowserKind = detectKind()): InstallGuide {
  switch (kind) {
    case "ios-safari":
      return {
        kind,
        browserLabel: "Safari (iPhone)",
        title: "Safari मध्ये हे करा",
        steps: [
          "खाली Share बटण (□↑) दाबा",
          "«Add to Home Screen» / होम स्क्रीनवर जोडा निवडा",
          "Add / जोडा दाबा",
          "होम स्क्रीनवरील नवीन आयकॉन उघडा",
        ],
        tip: "आयकॉनमधून उघडल्यावर वरचा लिंक दिसणार नाही. सामान्य लोकांना फक्त अ‍ॅप दिसेल.",
        canNativeInstall: false,
      };
    case "ios-other":
      return {
        kind,
        browserLabel: "iPhone · इतर ब्राउझर",
        title: "आधी Safari मध्ये उघडा",
        steps: [
          "खाली Share / ⋯ मेनू दाबा",
          "«Open in Safari» / Safari मध्ये उघडा निवडा",
          "Safari मध्ये Share (□↑) → Add to Home Screen",
          "Add दाबा · होम स्क्रीनवरील आयकॉन उघडा",
        ],
        tip: "Chrome / Firefox iPhone वर थेट आयकॉन देत नाहीत — Safari हवा.",
        canNativeInstall: false,
      };
    case "android-chrome":
      return {
        kind,
        browserLabel: "Chrome (Android)",
        title: "Chrome मध्ये हे करा",
        steps: [
          "वर उजवीकडे ⋮ (तीन बिंदू) दाबा",
          "«Install app» / «Add to Home screen» / होम स्क्रीनवर जोडा",
          "Install / Add दाबा",
          "होम स्क्रीनवरील नवीन आयकॉन उघडा",
        ],
        tip: "काही फोनवर वर «Install» बॅनर येतो — तोही चालेल.",
        canNativeInstall: true,
      };
    case "android-samsung":
      return {
        kind,
        browserLabel: "Samsung Internet",
        title: "Samsung ब्राउझर मध्ये",
        steps: [
          "खाली / वर मेनू ☰ किंवा ⋮ दाबा",
          "«Add page to» → «Home screen» निवडा",
          "Add दाबा",
          "होम स्क्रीनवरील नवीन आयकॉन उघडा",
        ],
        tip: "Samsung आणि Chrome दोन्ही चालतील — फक्त पावले थोडी वेगळी.",
        canNativeInstall: true,
      };
    case "android-other":
      return {
        kind,
        browserLabel: "Android ब्राउझर",
        title: "या ब्राउझर मध्ये",
        steps: [
          "मेनू ⋮ / ☰ दाबा",
          "«Add to Home screen» / «Install app» / होम स्क्रीनवर जोडा शोधा",
          "Add / Install दाबा",
          "होम स्क्रीनवरील नवीन आयकॉन उघडा",
        ],
        tip: "मेनू शब्द वेगळा असू शकतो — «Home screen» / «होम स्क्रीन» शोधा.",
        canNativeInstall: true,
      };
    case "desktop":
      return {
        kind,
        browserLabel: "संगणक",
        title: "फोनवर बसवा",
        steps: [
          "ही लिंक फोनवर WhatsApp / मेसेजने पाठवा",
          "फोनच्या Chrome किंवा Safari मध्ये उघडा",
          "तिथे Add to Home Screen / Install करा",
          "फोनच्या होम स्क्रीनवरील आयकॉन वापरा",
        ],
        tip: "अ‍ॅप आयकॉन फोनसाठी आहेत — संगणकावरही Install चालू शकते, पण मुख्य वापर फोनवर.",
        canNativeInstall: true,
      };
    default:
      return {
        kind: "unknown",
        browserLabel: "ब्राउझर",
        title: "होम स्क्रीनवर जोडा",
        steps: [
          "ब्राउझर मेनू ⋮ / Share दाबा",
          "«Add to Home Screen» / «Install app» निवडा",
          "Add / Install दाबा",
          "होम स्क्रीनवरील आयकॉन उघडा",
        ],
        tip: "वेगवेगळ्या फोन/ब्राउझरवर मेनू थोडा वेगळा दिसू शकतो.",
        canNativeInstall: true,
      };
  }
}

export function detectBrowserKind(): BrowserKind {
  return detectKind();
}
