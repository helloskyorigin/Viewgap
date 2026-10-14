import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'StrangerLens — AI Website First-Impression Analyzer',
  description: "See your website through a stranger's eyes. AI-powered website first-impression clarity analyzer evaluating visitor clarity across five signals.",
  openGraph: {
    title: 'StrangerLens — AI Website First-Impression Analyzer',
    description: "See your website through a stranger's eyes. AI-powered website first-impression clarity analyzer evaluating visitor clarity across five signals.",
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StrangerLens — AI Website First-Impression Analyzer',
    description: "See your website through a stranger's eyes. AI-powered website first-impression clarity analyzer evaluating visitor clarity across five signals.",
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
