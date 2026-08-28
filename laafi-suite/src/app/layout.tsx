import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LAAFI CAFÉ — Gestion",
  description: "Le goût des ambitions. Suite de gestion LAAFI CAFÉ.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#96602f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        {children}
      </body>
    </html>
  );
}
