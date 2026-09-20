import type { Metadata } from "next";
import "@/styles/globals.css";
import { AppShell } from "./AppShell";

export const metadata: Metadata = {
  title: "WardAlert G-South · Municipal Flood & Drainage Operations",
  description:
    "Real-time residual flood risk and cause diagnosis system for Mumbai Ward G-South. Operational dashboard for BMC disaster management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f7f8fa] text-[#1a1f2e] min-h-screen antialiased flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
