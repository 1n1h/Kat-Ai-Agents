import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // when the on-screen keyboard opens, shrink the layout instead of
  // panning it (keeps the composer anchored on mobile)
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "CounselOS — AI workspace for attorneys",
  description:
    "Specialist legal AI agents: litigation analysis, contract review, drafting, and citation check — orchestrated, cited, and verified.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${sourceSerif.variable} ${archivo.variable} ${plexMono.variable} antialiased`}
      >
        {/* dark is the default; apply .light before paint if the user chose it */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('counselos.theme')==='light')document.documentElement.classList.add('light')}catch(e){}",
          }}
        />
        {children}
      </body>
    </html>
  );
}
