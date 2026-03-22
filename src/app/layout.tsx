
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';
import ClientLayout from '@/components/ClientLayout';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const space_grotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

export const metadata: Metadata = {
  title: 'Khatupati Suit | Production Management',
  description: 'Production management app for Khatupati Suits, Surat.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Khatupati',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${space_grotesk.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Khatupati" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="font-body antialiased bg-background min-h-screen">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
