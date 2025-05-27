import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Virtus Booking System",
  description: "Water filtration technician booking management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          {children}
          <Toaster 
            position="bottom-right"
            toastOptions={{
              classNames: {
                error: 'bg-red-50 border-red-200',
                success: 'bg-green-50 border-green-200',
                warning: 'bg-yellow-50 border-yellow-200',
                info: 'bg-blue-50 border-blue-200',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}