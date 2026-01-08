import type { Metadata } from "next";
import { Geist, Geist_Mono, Sacramento, Quicksand, Nunito} from "next/font/google";
import "./globals.css";

const brandFont = Sacramento({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "400",
});

const quickSand = Quicksand({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-quick-sand",
});


const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-nunito",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        className={`${geistSans.variable} ${geistMono.variable} ${brandFont.variable} ${quickSand.variable} ${nunito.variable}`}
      >
        {children}
      </body>
    </html>
  )
}


// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en">
//       <body
//         className={`${geistSans.variable} ${geistMono.variable} antialiased`}
//       >
//         {children}
//       </body>
//     </html>
//   );
// }

/* export default function Home() {
  return (
    <main>
      <h1>Wintrides</h1>
    </main>
  );
}
*/

