import type { Metadata } from "next";
import "@/styles/globals.css";
import { AppShell } from "./AppShell";

export const metadata: Metadata = {
  title: "WardAlert: Hyperlocal Flood and Drainage Intelligence for Mumbai Ward G/South",
  description:
    "Real-time residual flood risk dashboard separating rainfall from drainage failure with XGBoost, SHAP explanations, and drain health tracking for Mumbai Ward G/South.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f8fafc] text-slate-900 min-h-screen antialiased flex flex-col selection:bg-[#0066cc]/15 selection:text-[#0066cc]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
