import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { ThemeProvider } from '../components/theme-provider';
import { AuthProvider } from '../components/auth-provider';

export const metadata: Metadata = {
  title: 'Website Analyzer Pro',
  description: 'Umfassender SEO, Security & Legal Scanner für deine Websites',
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
