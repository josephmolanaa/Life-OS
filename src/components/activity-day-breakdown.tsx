type Props = {
  categories: [string, number][];
  colors: Record<string, string>;
};

export function ActivityDayBreakdown({ categories, colors }: Props) {
  const entries = categories.filter(([, minutes]) => Number.isFinite(minutes) && minutes > 0);
  const total = entries.reduce((sum, [, minutes]) => sum + minutes, 0);
  const remaining = Math.max(0, 1440 - total);
  // ponytail: overlapping activity is normalized; deduplicate intervals upstream when available.
  const denominator = Math.max(1440, total);
  const segments = [...entries, ...(remaining > 0 ? [['Untracked', remaining] as [string, number]] : [])];
  const duration = (minutes: number) => `${Math.floor(Math.round(minutes) / 60)}h ${Math.round(minutes) % 60}m`;

  return (
    <div className="activityDayBreakdown">
      <div className="activityDayHeading">
        <h3>24 hours breakdown</h3>
        <span className="muted">{duration(total)} tracked</span>
      </div>
      <div className="activityDayBar" role="group" aria-label="Activity categories across 24 hours">
        {segments.map(([category, minutes]) => (
          <div
            key={category}
            className="activityDaySegment"
            tabIndex={0}
            aria-label={`${category}: ${duration(minutes)}`}
            style={{ flex: `${minutes / denominator} 1 0%` }}
          >
            <span className="activityDayFill" style={{ backgroundColor: colors[category] || 'var(--border2, #262522)' }} />
            <span className="activityDayTooltip" role="tooltip">{category}: {duration(minutes)}</span>
          </div>
        ))}
      </div>
      <div className="activityDayHeading muted">
        <span>0h</span><span>{duration(remaining)} untracked</span><span>24h</span>
      </div>
      {total > 1440 && <p className="muted">Recorded time exceeds 24h; segments scaled to fit.</p>}
    </div>
  );
}
