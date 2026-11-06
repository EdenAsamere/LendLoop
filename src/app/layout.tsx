import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "../components/ConvexClientProvider";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LendLoop — Neighborhood Tool Library",
  description: "Borrow what you need. Lend what you don't. Curated neighborhood tool sharing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body className="font-sans antialiased bg-[#FAF9F6] text-[#181816] selection:bg-[#181816] selection:text-white">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}

