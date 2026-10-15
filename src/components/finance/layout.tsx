"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/lib/actions';
import { ChromeControls, SidebarToggleButton } from './chrome-controls';
import {
  ArrowLeftRight,
  BarChart3,
  Settings,
  Activity,
  LayoutGrid,
  ListChecks,
  Users,
  BrainCircuit,
  HeartPulse,
  Flame,
  Wallet,
  ChevronDown,
  ChevronRight,
  BookOpen,
  FileText,
  Calendar,
  LogOut
} from 'lucide-react';
import { QuickFab } from './quick-fab';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getLang, type Lang } from '@/lib/i18n';

const navGroups = [
  {
    title: 'Main',
    items: [
      { href: '/', label: 'Dashboard', Icon: LayoutGrid },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/finance', label: 'Overview', Icon: Wallet },
      { href: '/finance/reports', label: 'Reports', Icon: BarChart3 },
      { href: '/finance/loans', label: 'Loans', Icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/activitywatch', label: 'Activity', Icon: Activity },
      { href: '/habits', label: 'Habits', Icon: ListChecks },
      { href: '/diary', label: 'Diary', Icon: BookOpen },
    ],
  },
  {
    title: 'Pillars',
    items: [
      { href: '/career', label: 'Career', Icon: BrainCircuit },
      { href: '/physique', label: 'Physique', Icon: HeartPulse },
      { href: '/social', label: 'Social', Icon: Users },
      { href: '/discipline', label: 'Discipline', Icon: Flame },
    ],
  },
  {
    title: 'Study',
    items: [
      { href: '/study/jadwal', label: 'Schedule', Icon: Calendar },
      { href: '/study/rps', label: 'RPS', Icon: FileText },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/settings', label: 'Settings', Icon: Settings },
    ],
  },
];
const groupLabels: Record<Lang, Record<string, string>> = {
  en: { Main: 'Main', Finance: 'Finance', Tools: 'Tools', Pillars: 'Pillars', Study: 'Study', System: 'System' },
  id: { Main: 'Utama', Finance: 'Keuangan', Tools: 'Alat', Pillars: 'Pilar', Study: 'Studi', System: 'Sistem' },
};

const navLabels: Record<Lang, Record<string, string>> = {
  en: { '/': 'Dashboard', '/finance': 'Overview', '/finance/reports': 'Reports', '/finance/loans': 'Loans', '/activitywatch': 'Activity', '/habits': 'Habits', '/diary': 'Diary', '/career': 'Career', '/physique': 'Physique', '/social': 'Social', '/discipline': 'Discipline', '/study/jadwal': 'Schedule', '/study/rps': 'RPS', '/settings': 'Settings' },
  id: { '/': 'Dasbor', '/finance': 'Ringkasan', '/finance/reports': 'Laporan', '/finance/loans': 'Utang', '/activitywatch': 'Aktivitas', '/habits': 'Kebiasaan', '/diary': 'Catatan', '/career': 'Karier', '/physique': 'Fisik', '/social': 'Sosial', '/discipline': 'Disiplin', '/study/jadwal': 'Jadwal', '/study/rps': 'RPS', '/settings': 'Pengaturan' },
};
export function Topbar({ title }: { title: string }) {
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
      setAvatarUrl(String(data.user?.user_metadata?.avatar_url ?? ''));
    });
  }, []);

  const name = email.split('@')[0] || 'User';

  return <header className="topbar">
    <div className="topbarLeft"><h1>{title}</h1></div>
    <div className="topbarRight">
      <ChromeControls />
      <details className="accountMenu">
        <summary aria-label="Account menu"><span className="accountAvatar">{avatarUrl ? <Image unoptimized width={80} height={80} src={avatarUrl} alt="" /> : name[0]?.toUpperCase()}</span><ChevronDown size={12} aria-hidden="true" /></summary>
        <div className="accountDropdown">
          <div><b>{name}</b><small>{email || 'Life OS account'}</small></div>
          <Link href="/account" className="accountLogout" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Edit account</Link>
          <form action={signOut}><button className="accountLogout">Logout</button></form>
        </div>
      </details>
    </div>
  </header>;
}

function subscribeSidebar(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener('lifeos-sidebar', onChange);
  return () => { window.removeEventListener('storage', onChange); window.removeEventListener('lifeos-sidebar', onChange); };
}

function sidebarSnapshot() {
  try { return localStorage.getItem('sidebar_collapsed_groups') || '{}'; } catch { return '{}'; }
}

function subscribeCompact(onChange: () => void) {
  const query = window.matchMedia('(max-width: 1100px)');
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

export function BottomNav() {
  const pathname = usePathname();
  const savedGroups = useSyncExternalStore(subscribeSidebar, sidebarSnapshot, () => '{}');
  let collapsedGroups: Record<string, boolean> = {};
  try {
    const parsed = JSON.parse(savedGroups);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) collapsedGroups = parsed;
  } catch { /* Ignore malformed browser preferences. */ }
  const [lang, setLang] = useState<Lang>('en');
  const isCompact = useSyncExternalStore(subscribeCompact, () => window.matchMedia('(max-width: 1100px)').matches, () => false);

  useEffect(() => { getLang().then(setLang); }, []);

  useEffect(() => {
    if (window.matchMedia('(max-width: 760px)').matches) {
      document.querySelector('.bottom [aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, [pathname, isCompact]);

  const primaryNavGroups = navGroups.filter(group => group.title !== 'System');
  const systemItems = navGroups.find(group => group.title === 'System')?.items ?? [];

  const toggleGroup = (title: string) => {
    const next = { ...collapsedGroups, [title]: !collapsedGroups[title] };
    localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(next));
    window.dispatchEvent(new Event('lifeos-sidebar'));
  };

  return <nav className="bottom" aria-label="Primary navigation">
    <div className="navHead"><Image unoptimized width={32} height={32} className="navLogo" src="/icon2.ico" alt="" /><div className="navBrand"><span>Sch</span></div><SidebarToggleButton /></div>
    <div className="navScroll">
      {primaryNavGroups.map(group => {
        const isCollapsed = !!collapsedGroups[group.title];
        return <div key={group.title} className="nav-group">
          <button type="button" aria-expanded={!isCollapsed} className="nav-group-title" onClick={() => toggleGroup(group.title)}>
            <span>{groupLabels[lang][group.title]}</span>
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          {(!isCollapsed || isCompact) && group.items.map(({ href, label, Icon }) => {
            const isActive = pathname === href || (href !== '/' && href !== '/finance' && pathname.startsWith(`${href}/`));
            const localizedLabel = navLabels[lang][href] ?? label;
            return <Link key={href} href={href} aria-label={localizedLabel} title={localizedLabel} aria-current={isActive ? 'page' : undefined} className={`nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></span>
              <span className="nav-label">{localizedLabel}</span>
            </Link>;
          })}
        </div>;
      })}
    </div>
    <div className="navFooter">
      {systemItems.map(({ href, label, Icon }) => {
        const isActive = pathname === href || (href === '/settings' && pathname.startsWith('/finance/settings'));
        return <Link key={href} href={href} aria-label={navLabels[lang][href] ?? label} title={navLabels[lang][href] ?? label} aria-current={isActive ? 'page' : undefined} className={`nav-item nav-footer-item ${isActive ? 'active' : ''}`}>
          <span className="nav-icon"><Icon size={18} strokeWidth={2.1} aria-hidden="true" /></span>
          <span className="nav-label">{navLabels[lang][href] ?? label}</span>
        </Link>;
      })}
      <form action={signOut}><button className="nav-item nav-footer-item nav-logout" type="submit" aria-label={lang === 'id' ? 'Keluar' : 'Sign Out'} title={lang === 'id' ? 'Keluar' : 'Sign Out'}><span className="nav-icon"><LogOut size={18} strokeWidth={2.1} aria-hidden="true" /></span><span className="nav-label">{lang === 'id' ? 'Keluar' : 'Sign Out'}</span></button></form>
    </div>
  </nav>;
}
export function Shell({ title, children, quickFab = true }: { title: string; children: React.ReactNode; quickFab?: boolean }) {
  
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('sidebar-collapsed')) {
        document.body.classList.add('aside');
      } else {
        document.body.classList.remove('aside');
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class']});
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <a className="skipLink" href="#main-content">Skip to content</a>
      <main className="shell" id="main-content" tabIndex={-1}>
      <style dangerouslySetInnerHTML={{ __html: `
        .nav-group { margin-bottom: 1rem; }
        .nav-group-title, .nav-label, .navBrand span { transition: all 0.2s ease; }
        
        .nav-item {
          display: flex;
          align-items: center;
          padding: 0.6rem 1rem;
          border-radius: 6px;
          margin: 0 0.5rem;
          transition: background 0.2s ease, color 0.2s ease;
        }
        .nav-item:hover { background-color: var(--surface2); }
        .nav-item.active { background-color: var(--accent); color: var(--accentText, #fff); }
        .nav-icon { margin-right: 0.75rem; transition: margin 0.2s ease; }
        .nav-label { font-size: 0.875rem; font-weight: 500; }
        
        .nav-group-title {
            width: 100%;
            border: 0;
            background: transparent;
            font-family: inherit;
            text-align: left;
            font-size: 0.7rem;
            font-weight: 600;
            color: var(--text2);
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 0 1rem;
            margin-bottom: 0.75rem;
            user-select: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .nav-group-title:hover {
            color: var(--text);
        }

        html.sidebar-collapsed .nav-group-title,
        html.sidebar-collapsed .nav-label,
        html.sidebar-collapsed .navBrand span {
          display: none !important;
        }
        html.sidebar-collapsed .nav-item {
          justify-content: center;
        }
        html.sidebar-collapsed .nav-icon {
          margin-right: 0;
        }

        .dashboard-card {
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.25rem;
          background-color: var(--card-bg);
          transition: all 0.2s ease-in-out;
        }
        .card-link-wrapper {
          text-decoration: none;
          color: inherit;
          display: block;
          height: 100%;
        }
        .dashboard-card {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .dashboard-card .card-body {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .card-link-wrapper:hover .dashboard-card {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          border-color: var(--accent);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }
        .card-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text2);
        }
        .card-icon {
          color: var(--accent);
        }
        .card-body .card-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--text);
          margin: 0;
        }
        .card-change {
          font-size: 0.875rem;
          font-weight: 500;
          margin-top: 0.25rem;
        }
        .card-change.positive { color: var(--green); }
        .card-change.negative { color: var(--red); }
        .card-footer {
          margin-top: 1rem;
          border-top: 1px solid var(--border);
          padding-top: 0.75rem;
        }
        .card-link {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--accent);
        }
      ` }} />
      <Topbar title={title} />
      {children}
      <BottomNav />
      {quickFab && <QuickFabSlot />}
      </main>
    </>
  );
}

function QuickFabSlot() {
  return <QuickFab transfer="Transfer" income="Income" expense="Expense" />;
}

export function SummaryCard({ label, value, tone, helper }: { label: string; value: string; tone?: 'positive' | 'negative'; helper?: string }) {
  return <div className="card summary"><div className="muted">{label}</div><div className={`big ${tone ?? ''}`}>{value}</div>{helper && <small className="muted">{helper}</small>}</div>;
}









