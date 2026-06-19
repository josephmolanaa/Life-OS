'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <main className="shell"><section className="card form"><span className="pill">Error</span><b>Finance page failed to load</b><p className="muted noMargin">{error.message}</p><button className="btn" type="button" onClick={reset}>Try again</button></section></main>;
}
