import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AuthorVault — Protect and Visualize Your Writing",
  description:
    "Upload your manuscripts, generate AI-powered visualizations, and maintain full legal rights to your creative work.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
