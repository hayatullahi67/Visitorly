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

const swCleanupScript = `
(function() {
  try {
    if (typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
      var p1 = ('caches' in window)
        ? caches.keys().then(function(keys) { return Promise.all(keys.map(function(k) { return caches.delete(k); })); })
        : Promise.resolve();
      var p2 = ('serviceWorker' in navigator)
        ? navigator.serviceWorker.getRegistrations().then(function(regs) {
            return Promise.all(regs.map(function(r) { return r.unregister(); }));
          })
        : Promise.resolve();
      Promise.all([p1, p2]).then(function() {
        if (hadController && !sessionStorage.getItem('__sw_cleared')) {
          sessionStorage.setItem('__sw_cleared', '1');
          location.reload();
        }
      });
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: swCleanupScript }} />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-slate-50 antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
