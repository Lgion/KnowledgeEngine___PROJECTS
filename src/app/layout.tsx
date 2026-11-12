import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Knowledge Engine | Master Anything",
  description: "Advanced SRS Learning Engine with Weighted Sliding Window algorithm.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body
          className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-zinc-50 dark:bg-black text-slate-900 dark:text-slate-100`}
        >
          {children}
          <script src="https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/sql-wasm.js" defer></script>
        </body>
      </html>
    </ClerkProvider>
  );
}
