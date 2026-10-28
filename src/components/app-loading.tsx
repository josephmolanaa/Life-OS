import { Suspense, type CSSProperties } from 'react';
import { FinanceModuleLoading, type FinanceLoadingVariant } from '@/components/finance/loading-content';
import { Shell } from '@/components/finance/layout';
import { ReportDetailLoading, ReportDetailLoadingFallback } from '@/components/report-detail-loading';

export function AppLoading() {
  return <PageLoading title="Loading..." variant="home" />;
}

type LoadingVariant = 'home' | 'finance' | 'reports' | 'report-realtime' | 'report-custom' | 'report-detail' | 'loans' | 'account' | 'dashboard' | 'study' | 'list' | 'form' | 'transaction-new' | 'transaction-edit' | 'wallet-edit' | 'settings' | 'habits' | 'diary' | 'career' | 'physique' | 'social' | 'discipline' | 'schedule' | 'rps' | 'login' | FinanceLoadingVariant;

function Line({ width = '100%', height = 16, style }: { width?: CSSProperties['width']; height?: number; style?: CSSProperties }) {
  return <span className="loadingLine" style={{ width, maxWidth: '100%', height, flexShrink: 0, ...style }} />;
}

function Heading({ subtitle = false }: { subtitle?: boolean }) {
  return <div className="loadingStack"><Line width="45%" height={22} />{subtitle && <Line width="70%" height={18} />}</div>;
}

function Field({ label = false }: { label?: boolean }) {
  return <div className="settingsField">{label && <Line width={110} height={18} />}<Line height={43} style={{ borderRadius: 9 }} /></div>;
}

// ponytail: unknown data uses three sample rows; pass cached row counts if exact list height is needed.
function Rows({ count = 3, secondary = true }: { count?: number; secondary?: boolean }) {
  return <div className="list">{Array.from({ length: count }, (_, index) => <div className="item" key={index}>
    <div className="loadingStack" style={{ flex: 1 }}><Line width="65%" height={21} />{secondary && <Line width="40%" height={16} />}</div><Line width={85} height={30} />
  </div>)}</div>;
}

function Tabs({ count = 3, detail = false }: { count?: number; detail?: boolean }) {
  return <div className={detail ? 'reportDetailTabs' : 'reportTabs'}>{Array.from({ length: count }, (_, index) => <div className="reportTab" key={index}><Line width="70%" height={21} /></div>)}</div>;
}

function DashboardLoadingContent() {
  return <div className="lifeDashboard dashboardLoadingSkeleton" aria-hidden="true">
    <div className="dashboardSplit"><div className="card skeletonBlock" /><div className="card skeletonBlock" /></div>
    <div className="dashboardPillars">{Array.from({ length: 5 }, (_, index) => <div className="card dashboard-card skeletonCard" key={index} />)}</div>
    <section className="card consistencyCard consistencyLoadingCard"><div className="consistencyHeader"><div><Line width={190} height={22} /><Line width={250} height={16} style={{ marginTop: 8 }} /></div><Line width={58} height={24} /></div><div className="consistencyScroll"><div className="consistencyYearGrid"><div className="consistencyMonths">{Array.from({ length: 53 }, (_, index) => <Line key={index} height={12} />)}</div><div className="consistencyWeekGrid">{Array.from({ length: 53 }, (_, week) => <div className="consistencyWeek" key={week}>{Array.from({ length: 7 }, (_, day) => <Line key={day} height={12} style={{ borderRadius: 2 }} />)}</div>)}</div></div></div></section>
    <div className="moduleSkeleton"><div className="card skeletonBlock" /><div className="card skeletonBlock" /></div>
  </div>;
}

function StudyLoadingContent() {
  return <div className="routeLoading studyHubLoadingSkeleton" aria-hidden="true">
    <div className="studyHubCards">{[0, 1].map(index => <div className="card" style={{ padding: 24 }} key={index}><div className="row" style={{ alignItems: 'center' }}><Line width={22} height={22} /><Line width="55%" height={22} /></div><Line width="82%" height={18} style={{ marginTop: 12 }} /></div>)}</div>
  </div>;
}

function FinanceLoadingContent() {
  return <div className="financeLoadingSkeleton" aria-hidden="true">
    <div className="financeToolbar"><Line width={180} height={40} /><Line width={270} height={40} /><Line width={90} height={40} /></div>
    <div className="financeModuleNav financeModuleNavLoading">{[72, 96, 78, 82, 76, 88].map((width, index) => <span className="financeNavLoadingItem" style={{ width }} key={index} />)}</div>
    <div className="financeWidgetGrid">
      <section className="financeWidget financeHero"><Heading /><Line width="45%" height={35} style={{ margin: '24px 0 20px' }} /><div className="financeHeroMetrics">{[0, 1, 2].map(index => <Line key={index} width={100} height={42} />)}</div><Line height={220} style={{ marginTop: 22, borderRadius: 12 }} /></section>
      <section className="financeWidget financeRecent"><Heading /><Rows count={5} /></section>
      {[0, 1, 2].map(index => <section className="financeWidget" key={index}><Heading /><Line height={200} style={{ marginTop: 24, borderRadius: 12 }} /></section>)}
    </div>
  </div>;
}

function ReportLoadingContent({ variant }: { variant: LoadingVariant }) {
  const lines = (count: number) => Array.from({ length: count }, (_, index) => <div className="reportLine" key={index}><Line width="65%" height={28} /><Line width={110} height={27} /></div>);
  return <div className="reportsLoadingSkeleton" aria-hidden="true">
    <div className="loadingBackLink"><Line width={142} height={18} /></div>
    {/* Keep the loading switcher aligned with the rendered report page. */}
    <Tabs count={variant === 'report-detail' ? 3 : 2} detail={variant === 'report-detail'} />
    {variant === 'reports' ? <div className="reportMonthList">{[0, 1].map(index => <div className="reportMonthBlock" key={index}><div className="reportMonthTitle"><Line width="40%" height={24} style={{ margin: '0 auto' }} /></div>{lines(5)}</div>)}</div>
      : variant === 'report-detail' ? <Suspense fallback={<ReportDetailLoadingFallback />}><ReportDetailLoading /></Suspense>
      : <><div className="card reportPanel"><div className="reportMonthTitle"><Line width="25%" height={24} style={{ margin: '0 auto' }} /></div>{variant === 'report-custom' ? <div className="empty"><Line height={21} /></div> : lines(4)}<div className="sectionGap"><Line width="50%" height={21} /></div></div>{variant === 'report-realtime' && <div className="card reportPanel"><Heading /><Rows /></div>}</>}
  </div>;
}

function LoansLoadingContent() {
  return <div className="routeLoading loansLoadingSkeleton" aria-hidden="true">
    <div className="grid grid2">{[0, 1].map(index => <div className="card" key={index}><Line width="45%" height={21} /><Line width="65%" height={28} style={{ margin: '12px 0 8px' }} /></div>)}
      <div className="card form"><Line width="45%" height={21} />{Array.from({ length: 7 }, (_, index) => <Field key={index} />)}<Line height={40} /></div>
    </div>
    <div className="list sectionGap">{[0, 1, 2].map(index => <div className="card loanDetails" key={index}><div className="loanSummary"><div className="loadingStack" style={{ width: '55%' }}><Line height={21} /><Line width="60%" height={18} /></div><Line width="20%" height={21} /></div></div>)}</div>
  </div>;
}

function HabitsLoadingContent() {
  return <div className="routeLoading habitsLoadingSkeleton" aria-hidden="true">
    <div className="card" style={{ padding: 'clamp(24px, 4vw, 32px)' }}><Line width={65} height={17} /><Line width="45%" height={28} style={{ margin: '8px 0 6px' }} /><Line width="65%" height={21} /></div>
    <DailyQuestLoadingContent />
  </div>;
}

function DailyQuestLoadingContent() {
  return <section className="card dailyQuestCard" aria-hidden="true">
    <div className="row" style={{ marginBottom: 18 }}><div className="loadingStack" style={{ flex: 1 }}><Line width={145} height={27} /><Line width={180} height={18} /></div><Line width={18} height={18} /></div>
    <div className="list" style={{ gap: 8, marginBottom: 20 }}>{[0, 1, 2].map(index => <div className="dailyQuestItem" key={index}><Line width={18} height={18} /><div className="dailyQuestContent"><Line width="65%" height={21} /><Line width={90} height={19} /></div><Line width={54} height={27} /></div>)}</div>
    <div className="dailyQuestForm"><Line height={36} /><Line width={72} height={36} /></div>
  </section>;
}

function DiaryLoadingContent() {
  return <div className="routeLoading diaryLoadingSkeleton" style={{ width: '100%', maxWidth: 800, marginInline: 'auto', paddingInline: 'min(16px, 4vw)', boxSizing: 'border-box' }} aria-hidden="true">
    <div className="diaryLoadingStats">{Array.from({ length: 3 }, (_, index) => <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }} key={index}><Line width={36} height={36} /><div className="loadingStack" style={{ flex: 1 }}><Line width="70%" height={17} /><Line width="45%" height={21} /></div></div>)}</div>
    <div className="card" style={{ padding: 24, borderColor: 'var(--accent)' }}>
      <div style={{ padding: '12px 16px', marginBottom: 20, borderLeft: '4px solid var(--accent)' }}><Line height={20} /></div>
      <div className="row" style={{ marginBottom: 20 }}><Line width="35%" height={24} /><Line width="40%" height={40} /></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>{[0, 1, 2, 3, 4].map(index => <Line width={75} height={36} key={index} />)}</div>
      <div className="loadingStack" style={{ height: 256 }}>{[90, 75, 95, 60].map(width => <Line key={width} width={`${width}%`} height={20} />)}</div>
    </div>
    <Line height={43} style={{ borderRadius: 9 }} />
    <div className="loadingStack" style={{ gap: 16 }}><div className="card"><Heading subtitle /><div className="spaced"><Line height={21} /><Line width="85%" height={18} style={{ marginTop: 10 }} /></div></div><div className="card"><Heading subtitle /><div className="spaced"><Line height={21} /><Line width="70%" height={18} style={{ marginTop: 10 }} /></div></div></div>
  </div>;
}

function PillarLoadingContent({ variant, inline = false }: { variant: 'career' | 'physique' | 'social' | 'discipline'; inline?: boolean }) {
  if (variant === 'career') return <div className="routeLoading careerLoadingSkeleton" aria-hidden="true">
    {!inline && <div className="card careerLoadingHeader" style={{ padding: 24 }}><div className="row"><div style={{ flex: 1 }}><Line width={65} height={17} /><Line width="55%" height={28} style={{ margin: '8px 0 6px' }} /><Line width="80%" height={21} /></div><Line width={100} height={39} /></div></div>}
    <div className="careerLoadingMetrics">{[0, 1, 2, 3].map(index => <div className="card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center' }} key={index}><Line width={40} height={40} /><div className="loadingStack" style={{ flex: 1 }}><Line width="65%" height={15} /><Line width="40%" height={27} /></div></div>)}</div>
    <div className="careerLoadingBranches">{[0, 1, 2].map(index => <div className="card" key={index}><Heading /><div className="loadingStack spaced">{[0, 1, 2].map(skill => <div className="loadingStack" key={skill}><div className="row"><Line width="40%" height={20} /><Line width="35%" height={17} /></div><Line height={8} /><div className="row"><Line width="30%" height={17} /><Line width="35%" height={17} /></div></div>)}</div></div>)}</div>
    <div className="card" style={{ padding: 16 }}><Line height={36} /></div>
  </div>;
  if (variant === 'physique') return <div className="grid grid2 physiqueLoadingSkeleton" style={{ marginBottom: 16, minWidth: 0 }} aria-hidden="true">
    <div className="card"><div className="row"><Line width="55%" height={27} /><Line width={65} height={32} /></div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 12 }}>{[0, 1, 2].map(index => <div key={index}><Line width="70%" height={18} /><Line width="70%" height={22} style={{ margin: '12px 0 8px' }} /></div>)}</div></div>
    <div className="card"><Heading /><div style={{ display: 'flex', gap: 8, marginTop: 12, minWidth: 0 }}><Line width={80} height={43} /><div style={{ flex: 1, minWidth: 0 }}><Field /></div><Line width={42} height={43} /></div><div className="spaced"><Rows /></div></div>
  </div>;
  if (variant === 'social' && inline) return <Rows />;
  if (variant === 'social') return <div className="card socialLoadingSkeleton" aria-hidden="true"><div className="row" style={{ marginBottom: 16 }}><Line width="40%" height={27} /><Line width={120} height={28} /></div><Rows /></div>;
  return <div className="routeLoading disciplineLoadingSkeleton" aria-hidden="true">
    <div className="row" style={{ alignItems: 'center' }}><Line width={160} height={21} /><Line width={110} height={40} /></div>
    <div className="grid grid2"><div className="card"><div className="row"><Line width="45%" height={27} /><Line width={65} height={28} /></div><Line height={6} style={{ marginTop: 16 }} /></div><div className="card"><Heading /><div style={{ marginTop: 12 }}><Rows count={4} secondary={false} /></div></div></div>
    <div className="card"><Line width={200} height={24} style={{ margin: '13px 0 16px' }} /><div className="disciplineLoadingHeatmap">{Array.from({ length: 30 }, (_, index) => <Line key={index} width={20} height={20} style={{ borderRadius: 4 }} />)}</div></div>
  </div>;
}

function StudyScheduleLoadingContent() {
  return <div className="routeLoading scheduleLoadingSkeleton" style={{ minWidth: 0 }} aria-hidden="true"><div className="row" style={{ alignItems: 'center' }}><Line width={180} height={30} /><Line width={130} height={32} /></div>
    <div className="studyScheduleCards">{Array.from({ length: 6 }, (_, index) => <div className="card" style={{ padding: 16 }} key={index}><Line width={100} height={18} /><Line width="80%" height={24} style={{ margin: '8px 0 16px' }} /><div className="loadingStack">{Array.from({ length: 3 }, (_, row) => <div className="loadingStack" key={row}><Line width={80} height={18} /><Line width="80%" height={21} /></div>)}</div></div>)}</div>
    <div className="card studyScheduleTable" style={{ padding: 0, overflow: 'hidden', maxWidth: '100%' }}><div style={{ overflowX: 'auto', maxWidth: '100%' }}><table className="scheduleLoadingTable" style={{ minWidth: 980 }}><thead><tr>{Array.from({ length: 7 }, (_, index) => <th key={index}><Line height={21} /></th>)}</tr></thead><tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>{Array.from({ length: 7 }, (_, col) => <td key={col}><Line height={col === 2 ? 30 : 21} /></td>)}</tr>)}</tbody></table></div></div>
  </div>;
}

function RpsLoadingContent() {
  return <div className="rpsLoadingSkeleton" style={{ minWidth: 0 }} aria-hidden="true">
    <div className="card" style={{ padding: 20 }}><Line height={21} style={{ margin: '14px 0' }} /><Line width={180} height={21} /></div>
    <div className="studyCourseList">{Array.from({ length: 6 }, (_, index) => <div className="card" style={{ padding: 20 }} key={index}><Line width={100} height={18} /><Line width="70%" height={26} style={{ margin: '14px 0' }} /><Line width={170} height={21} /></div>)}</div>
  </div>;
}

function LoginLoadingContent() {
  return <section className="loginLoadingCard card" aria-hidden="true"><Line width={130} height={13} /><Line width={130} height={36} style={{ margin: '10px 0 8px' }} /><Line width="88%" height={18} style={{ marginBottom: 16 }} /><div className="authTabs" style={{ display: 'flex', gap: 8, marginBottom: 16 }}><Line width={75} height={37} /><Line width={90} height={37} /></div><div className="form"><Field /><Field /><Line height={39} /></div><Line width="100%" height={1} style={{ margin: '20px 0' }} /><Line height={39} /></section>;
}

function SettingsLoadingContent() {
  return <div className="generalSettings settingsLoadingSkeleton" aria-hidden="true">
    <div className="settingsPageHeader"><Line width={170} height={17} /><Line width="55%" height={38} /></div>
    <div className="card generalSettingsCard"><div className="settingsSectionHeader"><div className="loadingStack" style={{ width: '100%' }}><Line width={85} height={32} /><Heading subtitle /></div></div><div className="generalSettingRow"><Line width={42} height={42} /><Heading subtitle /><Line width={160} height={38} /></div></div>
    <div className="card generalSettingsLinks"><div className="settingsSectionHeader"><div className="loadingStack" style={{ width: '100%' }}><Line width={160} height={32} /><Heading /></div></div><div className="settingsLink"><Line width="55%" height={21} /></div><div className="settingsLink"><Line width="65%" height={21} /></div></div>
    <div className="card appInfoCard"><div className="settingsSectionHeader"><div className="loadingStack" style={{ width: '100%' }}><Line width={90} height={32} /><Heading subtitle /></div><Line width={21} height={21} /></div><div className="appInfoRow"><div className="loadingStack"><Line width={55} height={18} /><Line width={125} height={16} /></div><Line width={125} height={39} /></div><div className="appInfoRow"><div className="loadingStack"><Line width={48} height={18} /><Line width={190} height={16} /></div></div></div>
    <div className="card aiSettingsCard aiConnectionCard"><div className="settingsSectionHeader"><div className="loadingStack" style={{ width: '100%' }}><Line width={85} height={32} /><Heading subtitle /></div></div><Line width={150} height={34} /><div className="aiDirectForm"><div className="settingsField"><Line width={90} height={18} /><div className="providerPicker">{[0, 1, 2].map(index => <div className="providerCard" key={index}><Heading subtitle /></div>)}</div></div><div className="aiDirectGrid"><Field label /><Field label /><div className="aiKeyField"><Field label /></div></div><div className="aiWizardActions"><Line width={140} height={40} /><Line width={180} height={40} /></div></div><div className="aiSecurityNote"><Line height={40} /></div></div>
  </div>;
}

function AccountLoadingContent() {
  return <div className="accountLoadingSkeleton" aria-hidden="true">
    <div className="card accountLoadingHeader skeletonCard" />
    <div className="card accountLoadingSection skeletonBlock" />
    <div className="card accountLoadingSection skeletonBlock" />
  </div>;
}

function ListLoadingContent({ rows }: { rows: number }) {
  return <div className="listLoadingSkeleton" aria-hidden="true">
    <div className="loadingLine listLoadingTitle" />
    <div className="listLoadingFilters"><span className="loadingLine" /><span className="loadingLine" /></div>
    <section className="card listLoadingRows">{Array.from({ length: rows }, (_, index) => <div className="loadingLine" key={index} />)}</section>
  </div>;
}

function FormLoadingContent() {
  return <div className="formRouteLoading" aria-hidden="true">
    <div className="loadingBackLink"><Line width={142} height={40} style={{ borderRadius: 9 }} /></div>
    <div className="card formLoadingSkeleton">
      <div className="loadingLine formLoadingTitle" />
      {Array.from({ length: 4 }, (_, index) => <div className="formLoadingField" key={index}><span className="loadingLine" /><span className="loadingLine" /></div>)}
      <div className="loadingLine formLoadingButton" />
    </div>
  </div>;
}

function FinanceFormLoadingContent({ kind }: { kind: 'transaction-new' | 'transaction-edit' | 'wallet-edit' }) {
  const isWallet = kind === 'wallet-edit';
  const isEdit = kind !== 'transaction-new';
  const field = (key: number, height = 43) => <div className="formLoadingField" key={key}><span className="loadingLine" /><span className="loadingLine" style={{ height, borderRadius: 9 }} /></div>;
  return <div className="financeFormLoading" aria-hidden="true">
    <div className="editPageNav loadingActionRow"><Line width={isEdit ? 142 : 90} height={40} style={{ borderRadius: 9 }} />{isEdit && <Line width={82} height={40} style={{ borderRadius: 9 }} />}</div>
    {!isWallet && !isEdit && <Tabs count={3} />}
    <div className="card form financeFormLoadingCard"><Line width={isWallet ? 120 : 150} height={22} />
      {(isWallet ? [0, 1, 2, 3] : [0, 1, 2, 3, 4]).map(key => field(key, key === 4 ? 78 : 43))}
      <Line width={130} height={40} style={{ borderRadius: 9 }} />
    </div>
  </div>;
}

function TrackerLoadingContent() {
  return <div className="trackerLoadingSkeleton" aria-hidden="true">
    <div className="grid grid2"><div className="card skeletonCard" /><div className="card skeletonCard" /></div>
    <div className="card skeletonBlock" />
  </div>;
}

export function PageLoading({ title = 'Loading...', blocks = 4, variant = 'dashboard' }: { title?: string; blocks?: number; variant?: LoadingVariant }) {
  if (variant === 'login') return <main className="authLoading pageLoading" aria-busy="true" aria-label="Loading content"><LoadingContent variant={variant} blocks={blocks} /></main>;
  return <Shell title={title} quickFab={false}><div className={`pageLoading pageLoading-${variant}`} role="status" aria-busy="true" aria-label="Loading content"><LoadingContent variant={variant} blocks={blocks} /></div></Shell>;
}

function LoadingContent({ variant, blocks }: { variant: LoadingVariant; blocks: number }) {
  switch (variant) {
    case 'login': return <LoginLoadingContent />;
    case 'home': return <DashboardLoadingContent />;
    case 'study': return <StudyLoadingContent />;
    case 'finance': return <FinanceLoadingContent />;
    case 'reports': case 'report-realtime': case 'report-custom': case 'report-detail': return <ReportLoadingContent variant={variant} />;
    case 'loans': return <LoansLoadingContent />;
    case 'habits': return <HabitsLoadingContent />;
    case 'diary': return <DiaryLoadingContent />;
    case 'career': case 'physique': case 'social': case 'discipline': return <PillarLoadingContent variant={variant} />;
    case 'schedule': return <StudyScheduleLoadingContent />;
    case 'rps': return <RpsLoadingContent />;
    case 'account': return <AccountLoadingContent />;
    case 'settings': return <SettingsLoadingContent />;
    case 'wallets': case 'transactions': case 'budgets': case 'net-worth': case 'btc': case 'activity': case 'finance-settings': return <FinanceModuleLoading variant={variant} />;
    case 'list': return <ListLoadingContent rows={blocks} />;
    case 'form': return <FormLoadingContent />;
    case 'transaction-new': case 'transaction-edit': case 'wallet-edit': return <FinanceFormLoadingContent kind={variant} />;
    default: return <TrackerLoadingContent />;
  }
}

export function ContentSkeleton({ blocks = 3, variant }: { blocks?: number; variant?: string }) {
  if (variant === 'career' || variant === 'physique' || variant === 'social' || variant === 'discipline' || variant === 'habits' || variant === 'diary') {
    return <div aria-busy="true" role="status" aria-label="Loading content"><div aria-hidden="true">
      {variant === 'habits' ? <DailyQuestLoadingContent /> : variant === 'diary' ? <DiaryLoadingContent /> : <PillarLoadingContent variant={variant} inline />}
    </div></div>;
  }
  return <div className={`contentSkeleton ${variant ? `contentSkeleton-${variant}` : ''}`} aria-busy="true" aria-label="Loading content">
    {Array.from({ length: blocks }, (_, index) => <div className={`card ${index === blocks - 1 ? 'skeletonBlock' : 'skeletonCard'}`} key={index} aria-hidden="true" />)}
  </div>;
}
