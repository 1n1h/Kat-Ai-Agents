import type { Metadata, Viewport } from "next";
import {
  Source_Serif_4,
  Archivo,
  IBM_Plex_Mono,
  Inter,
  Bricolage_Grotesque,
  Anton,
} from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500"],
});

// UI font for the sidebar — cleaner and larger-feeling than Archivo at small
// sizes, closer to the Claude app's navigation.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

// Display font — the landing hero headline only. Distinctive, confident
// grotesque that stands apart from the serif body and reads as a direct,
// modern statement.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
});

// Impact face for the hero headline — heavy, condensed, unmistakable.
const anton = Anton({
  subsets: ["latin"],
  variable: "--font-impact",
  weight: ["400"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f1b26",
  // when the on-screen keyboard opens, shrink the layout instead of
  // panning it (keeps the composer anchored on mobile)
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Sheehe & Associates — AI Workspace",
  description:
    "A team of legal specialists — litigation analysis, contract review, drafting, and citation check — orchestrated under one system that delegates, sequences, and verifies. Every finding cited; every draft audited.",
  manifest: "/manifest.webmanifest",
  applicationName: "Sheehe AI",
  appleWebApp: {
    capable: true,
    title: "Sheehe AI",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon.svg" }],
  },
  openGraph: {
    title: "Sheehe & Associates — AI Workspace",
    description:
      "Specialist legal AI agents, orchestrated, cited, and verified. You speak to the orchestrator; it runs the rest.",
    siteName: "Sheehe & Associates",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sheehe & Associates — AI Workspace",
    description:
      "Specialist legal AI agents, orchestrated, cited, and verified.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sourceSerif.variable} ${archivo.variable} ${plexMono.variable} ${inter.variable} ${bricolage.variable} ${anton.variable} antialiased`}
      >
        {/* dark is the default; apply .light before paint if the user chose it */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('counselos.theme')==='light')document.documentElement.classList.add('light')}catch(e){}",
          }}
        />
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
