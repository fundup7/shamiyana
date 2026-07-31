import type { Metadata } from "next";
import { Archivo_Narrow, Work_Sans } from "next/font/google";
import "./globals.css";

const archivoNarrow = Archivo_Narrow({
  variable: "--font-archivo-narrow",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Shamiyana | Event Rental Marketplace Hubli-Dharwad",
  description: "Direct event equipment rentals from verified local suppliers in Hubli and Dharwad. Rent tents, chairs, utensils, lighting, decor, and catering gear.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivoNarrow.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2] text-[#1E1B17]">{children}</body>
    </html>
  );
}
