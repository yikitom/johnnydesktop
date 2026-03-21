import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 工作台",
  description: "智能读书 · 数据洞察 · 高效决策",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
