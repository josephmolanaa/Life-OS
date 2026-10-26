import Link from 'next/link';

export type DashboardCardProps = {
  title: string;
  value: string | React.ReactNode;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon?: React.ReactNode;
  action?: React.ReactNode;
  link?: string;
  linkText?: string;
};

export function DashboardCard({ title, value, change, changeType, icon, action, link, linkText }: DashboardCardProps) {
  return (
    <div className="card dashboard-card">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 className="card-title" style={{ margin: 0 }}>{title}</h3>
          {action && <div className="card-action" style={{ zIndex: 10, position: 'relative' }}>{action}</div>}
        </div>
        {icon && <div className="card-icon">{icon}</div>}
      </div>
      <div className="card-body">
        <div className="card-value">{value}</div>
        {change && (
          <p className={`card-change ${changeType === 'positive' ? 'positive' : 'negative'}`}>
            {change}
          </p>
        )}
      </div>
      {link && (
        <div className="card-footer">
          <Link href={link} className="card-link" style={{ display: 'flex', alignItems: 'center', minHeight: 44 }} aria-label={`${linkText || 'Open'} ${title}`}>{linkText || 'Open'}</Link>
        </div>
      )}
    </div>
  );
}
