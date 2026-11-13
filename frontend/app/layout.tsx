import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaInstaller } from "@/components/pwa/pwa-installer";

export const viewport: Viewport = {
  themeColor: "#101923",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Metal Coil ERP",
  description: "Precision Metal Inventory, Slitting Traceability & Sales ERP",
  applicationName: "Metal Coil ERP",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Metal Coil ERP",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full overflow-x-hidden">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="h-full w-full max-w-[100vw] overflow-x-hidden antialiased selection:bg-amber-400 selection:text-slate-950">
        {children}
        <PwaInstaller />
      </body>
    </html>
  );
}
