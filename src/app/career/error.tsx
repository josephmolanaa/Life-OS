'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card" style={{ padding: '24px', display: 'grid', gap: '12px' }}>
      <h2 style={{ margin: 0, fontSize: '18px' }}>Career module error</h2>
      <p className="muted" style={{ margin: 0 }}>{error.message}</p>
      <button className="btn" type="button" onClick={() => reset()}>Try again</button>
   </div>
  );
}
