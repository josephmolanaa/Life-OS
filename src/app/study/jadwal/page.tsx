import { getStudySchedule } from '@/lib/study';
import { Shell } from '@/components/finance/layout';
import { getLang } from '@/lib/i18n';

export default async function JadwalPage() {
  const lang = await getLang();
  const id = lang === 'id';
  const schedule = getStudySchedule(id);

  return (
    <Shell title={id ? 'Jadwal Kuliah' : 'Class Schedule'} quickFab={false}>
      <div style={{ display: 'grid', gap: '20px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>SEMESTER 7</h2>
          <span className='pill'>{id ? 'Jadwal Kuliah' : 'Class Schedule'}</span>
        </div>

        <div className="studyScheduleCards">
          {schedule.map(item => <article className="card" key={item.code}>
            <small>{item.code}</small><h3>{item.course}</h3>
            <dl><dt>{id ? 'Hari / waktu' : 'Day / time'}</dt><dd>{item.day} · {item.time}</dd>
            <dt>{id ? 'Ruang' : 'Room'}</dt><dd>{item.room === '-' ? (id ? 'Belum ditentukan' : 'Not specified') : item.room}</dd>
            <dt>{id ? 'Dosen' : 'Lecturer'}</dt><dd>{item.lecturer === '-' ? (id ? 'Belum ditentukan' : 'Not specified') : item.lecturer}</dd></dl>
          </article>)}
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
                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace' }}>{item.sessions}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text2)' }}>{item.time}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text)' }}>{item.room}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text2)' }}>{item.lecturer}</td>
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
