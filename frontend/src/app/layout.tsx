import type { Metadata } from "next";
import "@/styles/globals.css";
import { AppShell } from "./AppShell";

export const metadata: Metadata = {
  title: "WardAlert — Hyperlocal Flood & Drainage Intelligence for Ward G-South, Mumbai",
  description:
    "Real-time residual flood risk dashboard separating rainfall from drainage failure with XGBoost, SHAP explanations, and drain health tracking for Mumbai Ward G-South.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0f] text-slate-100 min-h-screen antialiased flex flex-col selection:bg-[#7B68EE]/30 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
