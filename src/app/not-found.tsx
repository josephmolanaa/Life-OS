import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="shell">
      <section className="card form">
        <span className="pill">404</span>
        <b>Page not found</b>
        <p className="muted noMargin">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="btn">Go home</Link>
      </section>
    </main>
  );
}
