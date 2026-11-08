import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Visitorly",
  title: {
    default: "Visitorly | Estate Visitor Management",
    template: "%s | Visitorly",
  },
  description:
    "Professional visitor codes, gate access and estate management for residential communities. Fast, secure and easy to use.",
  keywords: [
    "visitor management",
    "estate security",
    "visitor pass",
    "gate access",
    "residential estate",
    "QR code visitor",
  ],
  authors: [{ name: "Visitorly" }],
  creator: "Visitorly",
  openGraph: {
    type: "website",
    locale: "en_NG",
    url: "https://visitorly.app",
    siteName: "Visitorly",
    title: "Visitorly | Estate Visitor Management",
    description:
      "Create visitor passes, manage gate access and keep your estate secure.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Visitorly",
    description: "Professional estate visitor management",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Visitorly",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-slate-50 antialiased`}>
        {children}
      </body>
    </html>
  );
}
