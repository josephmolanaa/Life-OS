import Link from 'next/link';
import { Shell } from '@/components/finance/layout';
import { copy, getLang } from '@/lib/i18n';

export default async function CustomReportPage() {
  const lang = await getLang();
  const c = copy[lang];

  return <Shell title={c.reportsTitle} quickFab={false}>
    <div className="reportTabs">
      <Link className="reportTab" href="/finance/reports/realtime">Realtime</Link>
      <Link className="reportTab" href="/finance/reports">Monthly</Link>
      <span className="reportTab active">Custom</span>
    </div>
    <div className="card reportPanel">
      <div className="reportMonthTitle">Custom Report</div>
      <div className="empty">Feature base ready. Next step: date range picker + filters + export.</div>
      <div className="muted sectionGap">{c.reportsTitle}</div>
    </div>
  </Shell>;
}
