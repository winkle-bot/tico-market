import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Manrope, Space_Grotesk } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ListingsProvider } from "@/context/ListingsContext";
import { ToastProvider } from "@/context/ToastContext";
import { I18nProvider } from "@/context/I18nContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineQueueManager } from "@/components/OfflineQueueManager";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "TicoMarket - P2P Marketplace Costa Rica",
  description: "P2P selling with reputation and express delivery in Costa Rica",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tico Market",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f5f8ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`
          }}
        />
      </head>
      <body className="antialiased bg-gray-50 text-gray-900">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[999] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold">
          Skip to content
        </a>
        <ToastProvider>
          <ErrorBoundary>
            <I18nProvider>
              <AuthProvider>
                <ListingsProvider>
                  {children}
                  <OfflineQueueManager />
                </ListingsProvider>
              </AuthProvider>
            </I18nProvider>
          </ErrorBoundary>
        </ToastProvider>
      </body>
    </html>
  );
}
