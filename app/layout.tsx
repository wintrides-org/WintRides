import type { Metadata } from "next";
import { Playfair_Display, Sacramento, Work_Sans} from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

// define the different font types
const headingFont = Playfair_Display({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const brandFont = Sacramento({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "400",
});

const bodyFont = Work_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WintRides - Campus Ridesharing",
  description: "Reliable, accessible and affordable rides for college students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${headingFont.variable} ${brandFont.variable} ${bodyFont.variable}`}
      >
        {children}
      </body>
    </html>
  )
}

/* export default function Home() {
  return (
    <main>
      <h1>Wintrides</h1>
    </main>
  );
}
*/

