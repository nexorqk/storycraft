import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Storycraft',
  description: 'AI-generated Russian children books in PDF format.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
