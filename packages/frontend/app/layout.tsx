import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "./components/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REPUTRANS - ZK Reputation Portability",
  description:
    "Privacy-preserving reputation transfer using zero-knowledge proofs, threshold EdDSA, and anonymous self-credentials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#080C15] text-[#F1F5F9]`}
      >
        <NavBar />
        <main className="min-h-screen pt-16">{children}</main>
      </body>
    </html>
  );
}
