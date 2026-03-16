import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/styles/globals.css";
import { FormFieldPlaceholderBridge } from "@/components/FormFieldPlaceholderBridge";
import { PortalActionNotificationsViewport } from "@/components/PortalActionNotificationsViewport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Veloro",
  description: "Veloro business portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <FormFieldPlaceholderBridge />
        {children}
        <PortalActionNotificationsViewport />
      </body>
    </html>
  );
}
