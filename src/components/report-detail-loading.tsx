'use client';

import { useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';

function Line({ width = '100%', height = 18, style }: { width?: CSSProperties['width']; height?: number; style?: CSSProperties }) {
  return <span className="loadingLine" style={{ width, maxWidth: '100%', minWidth: 0, height, flexShrink: 0, ...style }} />;
}

function Summary() {
  return <>{Array.from({ length: 5 }, (_, index) => <div className={`reportLine${index === 1 || index === 3 ? ' sub' : ''}`} key={index}><Line width="42%" height={index === 1 || index === 3 ? 16 : 20} /><Line width={100} height={index === 1 || index === 3 ? 16 : 20} /></div>)}</>;
}

function ProgressSection() {
  return <div className="reportDetailSection"><Line width={180} height={22} style={{ margin: '0 auto 4px' }} />{Array.from({ length: 4 }, (_, index) => <div className="reportProgressItem" key={index}><div className="reportProgressHead"><Line width="45%" height={20} /><Line width={92} height={20} /></div><Line height={6} /></div>)}</div>;
}

export function ReportDetailLoading() {
  const view = useSearchParams().get('view');
  return <ReportDetailLoadingFallback grouped={view === 'category' || view === 'title'} />;
}

export function ReportDetailLoadingFallback({ grouped = false }: { grouped?: boolean }) {
  return <div className="reportDetailBody">
    <div className="reportMonthTitle"><Line width="40%" height={24} style={{ margin: '0 auto' }} /></div>
    {grouped ? <><Summary /><ProgressSection /><ProgressSection /></> : <><div className="reportChartLoading" aria-hidden="true"><Line width={220} height={220} style={{ borderRadius: '50%', margin: '0 auto' }} /></div><div className="reportLegend">{[0, 1, 2, 3].map(index => <div className="reportLegendRow" key={index}><Line width={48} height={26} /><Line width="42%" height={20} /><Line width={80} height={20} /></div>)}</div></>}
  </div>;
}
