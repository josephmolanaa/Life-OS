'use client';

import { useEffect, useState } from 'react';
import type { MouseEvent } from 'react';
import { Menu, Moon, Sun } from 'lucide-react';

const usFlag = String.fromCodePoint(0x1F1FA, 0x1F1F8);
const idFlag = String.fromCodePoint(0x1F1EE, 0x1F1E9);

function getCookie(name: string) {
  return document.cookie.split('; ').find(row => row.startsWith(`${name}=`))?.split('=')[1];
}

export function ChromeControls() {
  const [darkMode, setDarkMode] = useState(false);
  const [lang, setLang] = useState<'en' | 'id'>('en');

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark-mode'));
    setLang(getCookie('finance-lang') === 'id' ? 'id' : 'en');
  }, []);

  function applyTheme(next: boolean) {
    document.documentElement.classList.toggle('dark-mode', next);
    localStorage.setItem('finance-theme', next ? 'dark' : 'light');
    setDarkMode(next);
  }

  function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
    const next = !document.documentElement.classList.contains('dark-mode');
    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!document.startViewTransition || prefersReducedMotion) {
      applyTheme(next);
      return;
    }

    document.documentElement.style.setProperty('--theme-x', `${x}px`);
    document.documentElement.style.setProperty('--theme-y', `${y}px`);
    document.documentElement.style.setProperty('--theme-r', `${endRadius}px`);
    document.startViewTransition(() => applyTheme(next));
  }

  function changeLang(nextLang: 'en' | 'id') {
    document.cookie = `finance-lang=${nextLang}; path=/; max-age=31536000; samesite=lax`;
    setLang(nextLang);
    window.location.reload();
  }

  return <div className="chromeControls">
    <button className="iconBtn" type="button" onClick={toggleTheme} aria-label="Toggle theme" title={darkMode ? 'Light mode' : 'Dark mode'}>
      {darkMode ? <Sun size={16} aria-hidden="true"/> : <Moon size={16} aria-hidden="true"/>}
    </button>
    <button className="iconBtn flagBtn" type="button" onClick={() => changeLang(lang === 'en' ? 'id' : 'en')} aria-label="Toggle language" title={lang === 'en' ? 'Switch to Indonesian' : 'Switch to English'}>
      {lang === 'en' ? usFlag : idFlag}
    </button>
  </div>;
}

export function SidebarToggleButton() {
  return <button className="iconBtn sidebarToggle inSidebarToggle" type="button" onClick={() => {
    const next = !document.documentElement.classList.contains('sidebar-collapsed');
    document.documentElement.classList.toggle('sidebar-collapsed', next);
    localStorage.setItem('finance-sidebar-collapsed', String(next));
  }} aria-label="Toggle sidebar"><Menu size={18} aria-hidden="true"/></button>;
}