import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-Gussing game",
  description: "Draw on a web canvas and let Gemini guess the sketch from a server route."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
