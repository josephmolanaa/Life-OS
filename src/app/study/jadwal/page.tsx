import { getLang } from '@/lib/i18n';
import { Shell } from '@/components/finance/layout';

type StudyItem = {
  code: string;
  course: string;
  day: string;
  sessions?: string | null;
  time?: string | null;
  room?: string | null;
  lecturer?: string | null;
};

export default async function JadwalPage() {
  const lang = await getLang();
  const id = lang === 'id';

  const schedule: StudyItem[] = [];
  const fetchErr = await (async () => {
    try {
      const res = await fetch('/api/study/schedule', { cache: 'no-store' });
      if (!res.ok) return new Error('Failed to load schedule');
      const data = await res.json();
      if (!Array.isArray(data)) return new Error('Invalid schedule data');
      for (const item of data) {
        schedule.push({
          code: String(item.code),
          course: String(item.course),
          day: String(item.day),
          sessions: item.sessions ?? null,
          time: item.time ?? null,
          room: item.room ?? null,
          lecturer: item.lecturer ?? null,
        });
      }
    } catch (err) {
      return err as Error;
    }
  })();

  const semester = schedule[0]?.semester || 'Semester 7';

  return (
    <Shell title={id ? 'Jadwal Kuliah' : 'Class Schedule'} quickFab={false}>
      <div style={{ display: 'grid', gap: '20px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{semester}</h2>
          <span className='pill'>{id ? 'Jadwal Kuliah' : 'Class Schedule'}</span>
        </div>

        {fetchErr && (
          <div className='card' style={{ padding: '20px', color: 'var(--text2)' }}>
            {fetchErr.message}
          </div>
        )}

        <div className="studyScheduleCards">
          {schedule.map(item => (
            <article className="card" key={item.code}>
              <small>{item.code}</small><h3>{item.course}</h3>
              <dl>
                <dt>{id ? 'Hari / waktu' : 'Day / time'}</dt><dd>{item.day} · {item.time}</dd>
                <dt>{id ? 'Ruang' : 'Room'}</dt><dd>{item.room === '-' || item.room == null ? (id ? 'Belum ditentukan' : 'Not specified') : item.room}</dd>
                <dt>{id ? 'Dosen' : 'Lecturer'}</dt><dd>{item.lecturer === '-' || item.lecturer == null ? (id ? 'Belum ditentukan' : 'Not specified') : item.lecturer}</dd>
              </dl>
            </article>
          ))}
        </div>
        <div className='card studyScheduleTable' style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }} tabIndex={0} aria-label={id ? 'Tabel jadwal kuliah, geser secara horizontal untuk melihat semua kolom' : 'Class schedule table, scroll horizontally to see all columns'}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  <th scope="col" style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600, width: '12%' }}>{id ? 'KODE' : 'CODE'}</th>
                  <th scope="col" style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600, width: '25%' }}>{id ? 'MATA KULIAH' : 'COURSE'}</th>
                  <th scope="col" style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'HARI' : 'DAY'}</th>
                  <th scope="col" style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'JAM KE' : 'SESSIONS'}</th>
                  <th scope="col" style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'WAKTU' : 'TIME'}</th>
                  <th scope="col" style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'RUANG' : 'ROOM'}</th>
                  <th scope="col" style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'DOSEN' : 'LECTURER'}</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border2)' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', fontSize: '13px', color: 'var(--text2)' }}>{item.code}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>{item.course}</td>
                    <td style={{ padding: '14px 16px' }}><span className='pill'>{item.day}</span></td>
                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace' }}>{item.sessions ?? '-'}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>{item.time ?? '-'}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text)' }}>{item.room ?? '-'}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text2)' }}>{item.lecturer ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Shell>
  );
}