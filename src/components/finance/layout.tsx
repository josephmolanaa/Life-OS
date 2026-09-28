"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/lib/actions';
import { ChromeControls, SidebarToggleButton } from './chrome-controls';
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
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
  Calendar
} from 'lucide-react';
import { QuickFab } from './quick-fab';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
      { href: '/study/jadwal', label: 'Jadwal', Icon: Calendar },
      { href: '/study/rps', label: 'RPS', Icon: FileText },
    ],
  },
  {
    title: 'System',
    items: [
      { href: '/finance/settings', label: 'Settings', Icon: Settings },
    ],
  },
];

export function Topbar({ title }: { title: string }) {
  const [email, setEmail] = useState('');

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);

  const name = email.split('@')[0] || 'User';

  return <header className="topbar">
    <div className="topbarLeft"><h1>{title}</h1></div>
    <div className="topbarRight">
      <ChromeControls />
      <details className="accountMenu">
        <summary aria-label="Account">{name[0]?.toUpperCase()}</summary>
        <div className="accountDropdown">
          <div><b>{name}</b><small>{email || 'Life OS account'}</small></div>
          <form action={signOut}><button className="accountLogout">Logout</button></form>
        </div>
      </details>
    </div>
  </header>;
}

export function BottomNav() {
  const pathname = usePathname();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed_groups');
    if (saved) setCollapsedGroups(JSON.parse(saved));
  }, []);

  const toggleGroup = (title: string) => {
    const next = { ...collapsedGroups, [title]: !collapsedGroups[title] };
    setCollapsedGroups(next);
    localStorage.setItem('sidebar_collapsed_groups', JSON.stringify(next));
  };

  return <nav className="bottom">
    <div className="navHead"><div className="navBrand"><span>Life OS</span></div><SidebarToggleButton /></div>
    {navGroups.map(group => {
      const isCollapsed = !!collapsedGroups[group.title];
      return (
        <div key={group.title} className="nav-group">
          <h2 
            className="nav-group-title" 
            onClick={() => toggleGroup(group.title)}
          >
            <span>{group.title}</span>
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </h2>
          {!isCollapsed && group.items.map(({ href, label, Icon }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
            return <Link key={href} href={href} className={`nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon"><Icon size={18} strokeWidth={2.2} aria-hidden="true" /></span>
              <span className="nav-label">{label}</span>
            </Link>;
          })}
        </div>
      );
    })}
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
    <main className="shell">
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
  );
}

function QuickFabSlot() {
  return <QuickFab transfer="Transfer" income="Income" expense="Expense" />;
}

export function SummaryCard({ label, value, tone, helper }: { label: string; value: string; tone?: 'positive' | 'negative'; helper?: string }) {
  return <div className="card summary"><div className="muted">{label}</div><div className={`big ${tone ?? ''}`}>{value}</div>{helper && <small className="muted">{helper}</small>}</div>;
}








