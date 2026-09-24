'use client';

import { Shell } from '@/components/finance/layout';
import { Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

export default function StudyPage() {
  return (
    <Shell title="Study Hub" quickFab={false}>
      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <Link href="/study/jadwal" className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={22} className="card-icon" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Jadwal Kuliah & Belajar</h2>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '13px' }}>Kelola dan lihat jadwal mata kuliah serta sesi belajar harian Anda.</p>
          </Link>
          <Link href="/study/rps" className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} className="card-icon" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>RPS (Rencana Pembelajaran Semester)</h2>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '13px' }}>Akses silabus, target materi, dan Rencana Pembelajaran Semester.</p>
          </Link>
        </div>
      </div>
    </Shell>
  );
}