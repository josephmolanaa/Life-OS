import type { Metadata, Viewport } from 'next';

export const dynamic = 'force-dynamic';
import './globals.css';
import { PrivacyProvider } from '@/components/finance/privacy-context';
import { PwaRegister } from '@/components/pwa-register';
import { AiSettingsProvider } from '@/components/ai-settings';
import { FloatingAiChat } from '@/components/floating-ai-chat';
import { getLang } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Personal command center for finance, activity, habits, and progress.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon2.ico',
    apple: '/icon2.ico',
  },
};

export const viewport: Viewport = {
  themeColor: '#121212',
};



const themeScript = `
(function(){
  try {
    var theme = localStorage.getItem('finance-theme');
    var sidebar = localStorage.getItem('finance-sidebar-collapsed');
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark-mode', theme ? theme === 'dark' : !!prefersDark);
    if (sidebar === 'true') {
      document.documentElement.classList.add('sidebar-collapsed');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning className="dark-mode">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <PwaRegister />
        <PrivacyProvider>
          <AiSettingsProvider>{children}<FloatingAiChat /></AiSettingsProvider>
        </PrivacyProvider>
      </body>
    </html>
  );
}


