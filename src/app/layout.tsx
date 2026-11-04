import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "ARINX — Your World. Your Videos.",
  description:
    "ARINX is a creator-first video platform. Watch, upload, share and grow.",
  applicationName: "ARINX",
  metadataBase: new URL(siteUrl()),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "ARINX",
    title: "ARINX — Your World. Your Videos.",
    description:
      "Watch, upload and share videos on ARINX — a clean, blue-metal, creator-first video platform.",
    url: siteUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "ARINX — Your World. Your Videos.",
    description:
      "Watch, upload and share videos on ARINX — a clean, blue-metal, creator-first video platform.",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
