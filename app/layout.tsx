import type { Metadata, Viewport } from "next";
import { Kalam } from "next/font/google";
import { PwaRegister } from "@/components/PwaRegister";
import "./globals.css";

const kalam = Kalam({
  subsets: ["devanagari", "latin"],
  weight: ["400", "700"],
  variable: "--font-kalam",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "अजपा संवाद",
    template: "%s · अजपा संवाद",
  },
  description: "अजपा प्रश्नोत्तर — परमानंद चरणसेवक व मार्गदर्शक संवाद · Add to Home Screen",
  applicationName: "अजपा संवाद",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "अजपा संवाद",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#c74407",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mr" className={kalam.variable}>
      <body className="min-h-dvh font-sans">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
