import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CLM System - Contract Lifecycle Management",
  description: "Modern contract lifecycle management dashboard with analytics and tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

