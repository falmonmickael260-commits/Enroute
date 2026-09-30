import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bebas_Neue, Rajdhani, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import "@/game/components/menu/menu.css";
import { BootLoader } from "@/game/components/animations/BootLoader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

// menus: condensed racing type, upright and italic
const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "KILOMAX",
  description:
    "KILOMAX, le jeu de plateau numérique de course automobile. Affrontez vos amis sur la route dans un jeu de cartes premium, animé et multijoueur.",
  applicationName: "KILOMAX",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KILOMAX",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/icon-180.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#14161c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${bebasNeue.variable} ${rajdhani.variable} ${barlowCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[var(--color-asphalt-900)] text-[var(--color-paper)]">
        {children}
        <BootLoader />
      </body>
    </html>
  );
}
