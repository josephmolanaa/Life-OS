import type { CSSProperties } from 'react';

// Shared skeleton primitives: abstract shapes only (no text/icons), sized to the real content.
export function Line({ width = '100%', height = 16, style }: { width?: CSSProperties['width']; height?: CSSProperties['height']; style?: CSSProperties }) {
  return <span className="loadingLine" aria-hidden="true" style={{ width, maxWidth: '100%', minWidth: 0, height, flexShrink: 0, ...style }} />;
}

export function Circle({ size }: { size: number }) {
  return <Line width={size} height={size} style={{ borderRadius: '50%' }} />;
}

export function IconBox({ size = 34, radius = 10 }: { size?: number; radius?: number }) {
  return <Line width={size} height={size} style={{ borderRadius: radius }} />;
}

export function DailyQuestSkeleton() {
  return <section className="card dailyQuestCard skeletonReveal" aria-hidden="true">
    <div className="row" style={{ marginBottom: 18 }}><div className="loadingStack" style={{ flex: 1 }}><Line width={145} height={27} /><Line width={180} height={18} /></div><Circle size={18} /></div>
    <div className="list" style={{ gap: 8, marginBottom: 20 }}>{[0, 1, 2].map(index => <div className="dailyQuestItem" key={index}><Line width={18} height={18} style={{ borderRadius: 4 }} /><div className="dailyQuestContent"><Line width="65%" height={18} /><Line width={70} height={16} /></div><Line width={54} height={27} style={{ borderRadius: 8 }} /></div>)}</div>
    <div className="dailyQuestForm"><Line height={36} /><Line width={72} height={36} style={{ borderRadius: 9 }} /></div>
  </section>;
}

export function TodoRowsSkeleton({ count = 3 }: { count?: number }) {
  return <div className="list skeletonReveal" style={{ display: 'grid', gap: 8, marginBottom: 20 }} aria-hidden="true">
    {Array.from({ length: count }, (_, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 8, background: 'var(--surface2)' }}>
      <Line width={16} height={16} style={{ borderRadius: 4 }} /><Line width={`${[62, 48, 55][index % 3]}%`} height={18} style={{ flex: '1 1 auto' }} /><Line width={44} height={14} /><Line width={36} height={33} style={{ borderRadius: 9 }} /><Line width={36} height={33} style={{ borderRadius: 9 }} />
    </div>)}
  </div>;
}

export function TodoListSkeleton() {
  return <section className="card skeletonReveal" style={{ padding: 24, display: 'flex', flexDirection: 'column', minWidth: 0 }} aria-hidden="true">
    <Line width={90} height={24} style={{ marginBottom: 4 }} /><Line width="70%" height={16} style={{ marginBottom: 16 }} />
    <TodoRowsSkeleton />
    <div className="dailyQuestForm dailyQuestFormWithPriority" style={{ marginTop: 'auto' }}><Line height={36} /><Line width={84} height={36} style={{ borderRadius: 6 }} /><Line width={72} height={36} style={{ borderRadius: 6 }} /></div>
  </section>;
}

export function PillarCardSkeleton() {
  return <div className="card dashboard-card" aria-hidden="true">
    <div className="card-header"><Line width="45%" height={14} /><IconBox /></div>
    <div className="card-body"><Line width="70%" height={28} style={{ marginTop: 20 }} /></div>
    <div className="card-footer"><Line width={44} height={14} style={{ margin: '15px 0' }} /></div>
  </div>;
}

export function ModuleCardsSkeleton() {
  const header = <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><Line width={140} height={24} /><IconBox size={18} radius={5} /></div>;
  return <div className="dashboardModules" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20 }} aria-hidden="true">
    <article className="card dashboardModuleCard" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18, flex: 1 }}>{[0, 1].map(index => <Line key={index} height={96} style={{ borderRadius: 8 }} />)}</div>
      <Line height={38} style={{ borderRadius: 9, marginTop: 'auto' }} />
    </article>
    <article className="card dashboardModuleCard" style={{ padding: 24 }}>
      {header}
      <Line width={50} height={12} style={{ marginBottom: 6 }} /><Line width="60%" height={18} style={{ marginBottom: 12 }} />
      <div style={{ display: 'grid', gap: 12 }}>{[0, 1, 2, 3, 4].map(index => <div key={index} style={{ display: 'grid', gap: 6 }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><Line width={`${[40, 32, 46, 28, 36][index]}%`} height={16} /><Line width={48} height={14} /></div><Line height={6} style={{ borderRadius: 3 }} /></div>)}</div>
      <Line height={38} style={{ borderRadius: 9, marginTop: 16 }} />
    </article>
  </div>;
}

export function ProgressRowsSkeleton({ count = 3 }: { count?: number }) {
  return <>{Array.from({ length: count }, (_, index) => <div key={index} className="skeletonReveal" style={{ display: 'grid', gap: 6 }} aria-hidden="true"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Line width={`${[55, 42, 48][index % 3]}%`} height={16} /><Line width={72} height={14} /></div><Line height={6} style={{ borderRadius: 3 }} /></div>)}</>;
}
