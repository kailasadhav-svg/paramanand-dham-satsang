import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "परमानंद धाम सत्संग",
  description: "सत्संग उपस्थिती, विषय, प्रश्नोत्तर आणि साप्ताहिक अहवाल",
  applicationName: "परमानंद धाम सत्संग",
  appleWebApp: {
    capable: true,
    title: "परमानंद धाम",
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
    <html lang="mr">
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
