'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <main className="shell">
          <section className="card form">
            <span className="pill">Error</span>
            <b>Something went wrong</b>
            <p className="muted noMargin">{error.message}</p>
            <button className="btn" onClick={() => reset()}>
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
