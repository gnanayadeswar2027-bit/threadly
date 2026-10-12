import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Threadly — AI GTM Copilot for Founders", description: "Turn customer conversations into your next customers." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
