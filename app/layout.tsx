import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "AI Study Assistant", description: "Chat with your study notes." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
