"use client";

import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell"><section className="card form" role="alert">
    <h1>Halaman belum dapat dimuat</h1>
    <p>Periksa koneksi lalu coba lagi. Data yang sudah tersimpan tetap tersedia.</p>
    <p lang="en">Unable to load this page. Check your connection and retry. Saved data is preserved.</p>
    <button className="btn" type="button" onClick={reset}>Coba lagi / Retry</button>
    <Link className="btn ghost" href="/">Beranda / Home</Link>
  </section></main>;
}
