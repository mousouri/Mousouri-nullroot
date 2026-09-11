import type { Metadata, Viewport } from "next";
import { Anton, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SiteChrome } from "@/components/chrome/SiteChrome";
import "./globals.css";

/* Display: Anton — condensed, heavy, aggressive at 12-20vw sizes.
   Body: Space Grotesk — grotesk warmth for readable prose.
   System: JetBrains Mono — every "machine" string on the site. */
const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mousouri.dev"),
  title: "MOUSOURI — Breaking Things on Purpose",
  description:
    "Computer engineering student & independent security researcher. Offensive security and bug bounty, MQL5 algo trading, full-stack web, embedded systems. Dar es Salaam, TZ.",
  keywords: [
    "security researcher",
    "bug bounty",
    "computer engineering",
    "MQL5",
    "algorithmic trading",
    "Next.js",
    "portfolio",
  ],
  authors: [{ name: "MOUSOURI" }],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "512x512" }],
  },
  alternates: {
    types: { "application/rss+xml": "/notes/rss.xml" },
  },
  openGraph: {
    title: "MOUSOURI — Breaking Things on Purpose",
    description:
      "Offensive security · algo trading · full-stack web · embedded. A portfolio built loud — with a 14-cabinet arcade.",
    url: "https://mousouri.dev",
    siteName: "MOUSOURI",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "MOUSOURI — a brutalist terminal portfolio with an arcade" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MOUSOURI — Breaking Things on Purpose",
    description: "Offensive security · algo trading · full-stack web · embedded. A portfolio built loud.",
    images: ["/og.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${anton.variable} ${grotesk.variable} ${jbmono.variable} bg-ink font-body text-paper antialiased`}
      >
        {/* apply the persisted colorway before first paint (no acid flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('nr-theme');if(t==='matrix'||t==='amber'||t==='void')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
        <SiteChrome>{children}</SiteChrome>
        {/* structured data — who built this and what it is */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: "MOUSOURI",
              url: "https://mousouri.dev",
              jobTitle: "Computer Engineering Student & Security Researcher",
              address: { "@type": "PostalAddress", addressLocality: "Dar es Salaam", addressCountry: "TZ" },
              knowsAbout: ["Offensive Security", "Bug Bounty", "MQL5", "Algorithmic Trading", "Next.js", "Embedded Systems"],
              sameAs: [
                "https://github.com/mousouri",
                "https://x.com/mousouri_dev",
                "https://hackerone.com/mousouri",
                "https://bugcrowd.com/mousouri",
                "https://linkedin.com/in/mousouri",
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
