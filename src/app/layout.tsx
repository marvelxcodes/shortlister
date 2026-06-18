import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shortlister — GenAI Recruitment Augmentation",
  description:
    "Semantic CV scoring, bias auditing and tailored interview questions for modern hiring teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
        </div>
        <Toaster
          position="top-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "rgba(20,14,10,0.92)",
              borderRadius: 14,
              border: "1px solid var(--color-border-strong)",
              boxShadow: "var(--shadow-pop)",
              color: "var(--color-ink)",
            },
          }}
        />
      </body>
    </html>
  );
}
