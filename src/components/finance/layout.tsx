"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/lib/actions';
import { ChromeControls, SidebarToggleButton } from './chrome-controls';
import { ArrowLeftRight, BarChart3, CreditCard, Home, Landmark, Settings, Activity, LayoutGrid } from 'lucide-react';
import { QuickFab } from './quick-fab';

export function Topbar({ title }: { title: string }) {
  return <header className="topbar">
    <div className="topbarLeft"><h1>{title}</h1></div>
    <div className="topbarRight">
      <ChromeControls />
      <details className="accountMenu">
        <summary aria-label="Account">J</summary>
        <div className="accountDropdown">
          <div><b>Joseph</b><small>Life OS account</small></div>
          <form action={signOut}><button className="accountLogout">Logout</button></form>
        </div>
      </details>
    </div>
  </header>;
}

export function BottomNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: 'Dashboard', Icon: LayoutGrid },
    { href: '/finance', label: 'Finance', Icon: CreditCard },
    { href: '/finance/activity', label: 'ActivityWatch', Icon: Activity },
    { href: '/finance/reports', label: 'Reports', Icon: BarChart3 },
    { href: '/finance/loans', label: 'Loans', Icon: ArrowLeftRight },
    { href: '/finance/settings', label: 'Settings', Icon: Settings },
  ];

  return <nav className="bottom">
    <div className="navHead"><div className="navBrand"><span>Life OS</span></div><SidebarToggleButton /></div>
    {navItems.map(({ href, label, Icon }) => {
      // Handle active state
      const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
      return (
        <Link 
          key={href} 
          href={href}
          className={isActive ? 'active' : ''}
          style={isActive ? { background: 'var(--surface2)', color: 'var(--text)' } : {}}
        >
          <span className="navIcon" style={isActive ? { background: 'var(--accent)', color: 'var(--accentText)' } : {}}><Icon size={18} strokeWidth={2.2} aria-hidden="true" /></span>
          <span className="navLabel">{label}</span>
        </Link>
      );
    })}
  </nav>;
}

export function Shell({ title, children, quickFab = true }: { title: string; children: React.ReactNode; quickFab?: boolean }) {
  return <main className="shell"><Topbar title={title}/>{children}<BottomNav/>{quickFab && <QuickFabSlot/>}</main>;
}

function QuickFabSlot() {
  return <QuickFab transfer="Transfer" income="Income" expense="Expense" />;
}

export function SummaryCard({ label, value, tone, helper }: { label: string; value: string; tone?: 'positive' | 'negative'; helper?: string }) {
  return <div className="card summary"><div className="muted">{label}</div><div className={`big ${tone ?? ''}`}>{value}</div>{helper && <small className="muted">{helper}</small>}</div>;
}
