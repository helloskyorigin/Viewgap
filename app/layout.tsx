import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'StrangerLens — AI Website First-Impression Analyzer',
  description: "See your website through a stranger's eyes. Get an AI-powered first-impression clarity review to discover what's unclear and how to improve.",
  openGraph: {
    title: 'StrangerLens — AI Website First-Impression Analyzer',
    description: "See your website through a stranger's eyes. Get an AI-powered first-impression clarity review to discover what's unclear and how to improve.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StrangerLens — AI Website First-Impression Analyzer',
    description: "See your website through a stranger's eyes. Get an AI-powered first-impression clarity review to discover what's unclear and how to improve.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
