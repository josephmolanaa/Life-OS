import { getLang } from '@/lib/i18n';

import { Shell } from '@/components/finance/layout';
import { Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function StudyPage() {
  const id = (await getLang()) === 'id';
  return (
    <Shell title={id ? 'Pusat Studi' : 'Study Hub'} quickFab={false}>
      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '16px' }}>
          <Link href="/study/jadwal" className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={22} className="card-icon" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{id ? 'Jadwal Kuliah' : 'Class Schedule'}</h2>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '13px' }}>{id ? 'Lihat jadwal mata kuliah semester 7.' : 'View semester 7 class times and rooms.'}</p>
          </Link>
          <Link href="/study/rps" className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FileText size={22} className="card-icon" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{id ? 'Rencana Pembelajaran Semester' : 'Semester Learning Plans'}</h2>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: '13px' }}>{id ? 'Lihat daftar mata kuliah dan ketersediaan dokumen RPS.' : 'View courses and syllabus availability.'}</p>
          </Link>
        </div>
      </div>
    </Shell>
  );
}
