import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import { AppNav } from "./_components/app-nav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mini Jira",
  description: "Mini Jira - Issues, Sprints, Activity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-black text-white`}>
        <Providers>
          <AppNav />
          <main className="mx-auto w-full max-w-5xl px-4 py-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
