import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ThemeProvider } from '../components/theme-provider';
import { AuthProvider } from '../components/auth-provider';

export const metadata: Metadata = {
  title: {
    default: 'Website Analyzer Pro - Dein All-in-One Website Scanner',
    template: '%s | Website Analyzer Pro',
  },
  description: 'Optimiere deine Website mit unserem umfassenden SEO, Security & Performance Scanner. Erhalte detaillierte Berichte und Handlungsempfehlungen.',
  keywords: ['SEO Scanner', 'Website Analyse', 'Security Check', 'Performance Optimierung', 'Lighthouse', 'Web Audit', 'Website Security'],
  authors: [{ name: 'Website Analyzer Pro' }],
  creator: 'Website Analyzer Pro',
  metadataBase: new URL('https://website-analyzer.pro'),
  openGraph: {
    type: 'website',
    locale: 'de_DE',
    url: 'https://website-analyzer.pro',
    title: 'Website Analyzer Pro - Dein All-in-One Website Scanner',
    description: 'Erreiche 100/100 Scores. Unser Scanner analysiert SEO, Security, Performance und mehr.',
    siteName: 'Website Analyzer Pro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Website Analyzer Pro - Website Scanner',
    description: 'Optimiere deine Website mit unserem umfassenden Scanner.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
