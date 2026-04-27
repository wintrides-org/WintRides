import type { Metadata } from "next";
import { Work_Sans } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

const bodyFont = Work_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "WintRides",
  description: "Campus ridesharing for students who need a ride or have one to offer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={bodyFont.variable}>
        {children}
        <SpeedInsights />
      </body>
    </html>
  )
}

