import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aria",
  description: "Real-time voice transformation with 3D audio visualization",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
