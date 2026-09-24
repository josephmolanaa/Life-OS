export default function Loading() {
  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card" style={{ padding: '24px', minHeight: '120px', opacity: 0.5 }}>
          <p className="muted" style={{ margin: 0 }}>Loading career data</p>
       </div>
      ))}
   </div>
  );
}
