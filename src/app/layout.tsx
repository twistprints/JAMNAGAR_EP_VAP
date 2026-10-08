import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/common/Header";

export const metadata: Metadata = {
  title: "Jamnagar Pass Management System | EP & VAP Portal",
  description:
    "Document and data management system for Entry Permits (EP) and Vehicle Access Permits (VAP) at Jamnagar Reliance Green and work areas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-navy-900 antialiased flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col">{children}</main>
      </body>
    </html>
  );
}
