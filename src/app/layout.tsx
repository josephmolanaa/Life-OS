import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PrivacyProvider } from '@/components/finance/privacy-context';

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Personal command center for finance, activity, habits, and progress.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#020617',
};

const themeScript = `
(function(){
  try {
    var theme = localStorage.getItem('finance-theme');
    var sidebar = localStorage.getItem('finance-sidebar-collapsed');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if ((theme ? theme === 'dark' : prefersDark)) {
      document.documentElement.classList.add('dark-mode');
    }
    if (sidebar === 'true') {
      document.documentElement.classList.add('sidebar-collapsed');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning className="dark-mode">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PrivacyProvider>
          {children}
        </PrivacyProvider>
      </body>
    </html>
  );
}
