import Link from 'next/link';
import { Shell } from '@/components/finance/layout';
import { getLang } from '@/lib/i18n';
import { getStudySchedule } from '@/lib/study';

export default async function RpsPage() {
  const id = (await getLang()) === 'id';
  return <Shell title={id ? 'Rencana Pembelajaran Semester' : 'Semester Learning Plans'} quickFab={false}>
    <div className="card" style={{ padding: 20 }}>
      <p>{id ? 'Dokumen RPS dan riwayat belajar belum tersedia. Progres belum dapat dihitung.' : 'Official syllabi and learning history are unavailable. Progress cannot be calculated yet.'}</p>
      <Link href="/study/jadwal">{id ? 'Lihat jadwal kuliah' : 'View class schedule'}</Link>
    </div>
    <div className="studyCourseList">{getStudySchedule(id).map(item => <article className="card" key={item.code} style={{ padding: 20 }}>
      <small>{item.code}</small><h2 style={{ fontSize: 17 }}>{item.course}</h2>
      <p>{id ? 'RPS belum tersedia' : 'Syllabus unavailable'}</p>
    </article>)}</div>
  </Shell>;
}
