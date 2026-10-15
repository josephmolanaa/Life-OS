'use client';

import { useSyncExternalStore } from 'react';
import { useClientReady } from '@/lib/use-client-ready';
import type { MouseEvent } from 'react';
import { ChevronLeft, CloudSun, Moon } from 'lucide-react';

function getCookie(name: string) {
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1];
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

export function ChromeControls({ expanded = false }: { expanded?: boolean }) {
  const darkMode = useSyncExternalStore(subscribeTheme, () => document.documentElement.classList.contains('dark-mode'), () => false);
  const ready = useClientReady();
  const lang = ready && getCookie('finance-lang') === 'id' ? 'id' : 'en';

  function applyTheme(next: boolean) {
    document.documentElement.classList.toggle('dark-mode', next);
    localStorage.setItem('finance-theme', next ? 'dark' : 'light');
  }

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    const next = !document.documentElement.classList.contains('dark-mode');
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || prefersReducedMotion) { applyTheme(next); return; }
    document.documentElement.style.setProperty('--theme-x', `${x}px`);
    document.documentElement.style.setProperty('--theme-y', `${y}px`);
    document.documentElement.style.setProperty('--theme-r', `${endRadius}px`);
    document.startViewTransition(() => applyTheme(next));
  }

  function changeLang(nextLang: 'en' | 'id') {
    document.cookie = `finance-lang=${nextLang}; path=/; max-age=31536000; samesite=lax`;
    window.location.reload();
  }

  return <div className={`chromeControls ${expanded ? 'settingsPreferenceControls' : ''}`}>
    <button className="themeSwitch" type="button" onClick={toggleTheme} aria-label="Toggle theme" aria-pressed={darkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>
      <span className="themeSwitchTrack" aria-hidden="true"><span className="themeSwitchThumb">{darkMode ? <Moon size={17}/> : <CloudSun size={19}/>}</span></span>
      {expanded && <span>{darkMode ? (lang === 'id' ? 'Tema gelap' : 'Dark theme') : (lang === 'id' ? 'Tema terang' : 'Light theme')}</span>}
    </button>
    <button className="languageControl" type="button" onClick={() => changeLang(lang === 'en' ? 'id' : 'en')} aria-label="Toggle language" title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}>
      <span className={`languageFlag languageFlag-${lang}`} aria-hidden="true" />
      <span>{lang.toUpperCase()}</span>
    </button>
  </div>;
}

export function SidebarToggleButton() {
  return <button className="iconBtn sidebarToggle inSidebarToggle" type="button" onClick={() => {
    const next = !document.documentElement.classList.contains('sidebar-collapsed');
    document.documentElement.classList.toggle('sidebar-collapsed', next);
    localStorage.setItem('finance-sidebar-collapsed', String(next));
  }} aria-label="Toggle sidebar"><ChevronLeft className="sidebarToggleChevron" size={20} aria-hidden="true"/></button>;
}