"use client";

import Link from 'next/link';

export default function FinanceError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell"><section className="card form" role="alert">
    <h1>Data keuangan belum dapat dimuat</h1>
    <p>Periksa koneksi lalu coba lagi. Saldo tidak ditampilkan agar data yang gagal dimuat tidak terbaca sebagai nol.</p>
    <p lang="en">Unable to load finance data. Check your connection and retry. Balances are hidden until data loads successfully.</p>
    <button className="btn" type="button" onClick={reset}>Coba lagi / Retry</button>
    <Link className="btn ghost" href="/">Beranda / Home</Link>
  </section></main>;
}
