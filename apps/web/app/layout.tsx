import type { Metadata } from 'next';

import './globals.css';
import { ThemeScript } from './components/theme-script';

export const metadata: Metadata = {
  title: 'Storycraft',
  description: 'Personalized Russian children stories.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>{children}</body>
    </html>
  );
}
