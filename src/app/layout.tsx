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
  title: "Shamiyana Near Me | Event & Tent House Rental Hubli-Dharwad",
  description: "Find verified Shamiyana, tent house, chairs, utensils, lighting & catering rentals near you in Hubli-Dharwad. Call or WhatsApp local vendors directly for instant availability.",
  keywords: [
    "Shamiyana near me",
    "Shamiyana Hubli",
    "Tent house rental Hubli",
    "Tent house Dharwad",
    "Chairs for rent near me",
    "Event utensils rental Hubli",
    "Sound and lighting rental Hubli",
    "Marriage tent house near me",
    "Shamiyana booking Hubli"
  ],
  metadataBase: new URL("https://hublishamiyana.vercel.app"),
  openGraph: {
    title: "Shamiyana Near Me | Direct Local Tent & Event Gear Rentals",
    description: "Rent tents, chairs, plates, lighting & sound equipment directly from verified local suppliers in Hubli-Dharwad. Instant phone & WhatsApp bookings.",
    url: "https://hublishamiyana.vercel.app",
    siteName: "Shamiyana",
    locale: "en_IN",
    type: "website",
  },
  other: {
    "geo.region": "IN-KA",
    "geo.placename": "Hubli-Dharwad",
    "geo.position": "15.3647;75.1240",
    "ICBM": "15.3647, 75.1240"
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Shamiyana - Event Rental Marketplace Hubli",
  "image": "https://hublishamiyana.vercel.app/images/hero.png",
  "@id": "https://hublishamiyana.vercel.app",
  "url": "https://hublishamiyana.vercel.app",
  "telephone": "+919886000000",
  "priceRange": "₹₹",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Vidyanagar, Gokul Road",
    "addressLocality": "Hubli",
    "addressRegion": "Karnataka",
    "postalCode": "580021",
    "addressCountry": "IN"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 15.3647,
    "longitude": 75.1240
  },
  "areaServed": ["Hubli", "Dharwad", "Belgaum", "Haveri"],
  "openingHoursSpecification": {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "opens": "06:00",
    "closes": "23:00"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "142"
  }
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#FAF7F2] text-[#1E1B17]">{children}</body>
    </html>
  );
}
