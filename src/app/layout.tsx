// src/app/layout.tsx
import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Yogveda Healthcare CRM',
  description: 'Enterprise CRM for Yogveda Healthcare',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        {children}
        <div id="toast-root" />
      </body>
    </html>
  );
}
