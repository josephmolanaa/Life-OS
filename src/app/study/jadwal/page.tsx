import { Shell } from '@/components/finance/layout';
import { getLang } from '@/lib/i18n';

export default async function JadwalPage() {
  const lang = await getLang();
  const id = lang === 'id';
  const schedule = [
    { code: 'NMNJ236034', course: 'Data Sains Untuk Analitik Pemasaran', day: id ? 'SENIN' : 'MONDAY', sessions: '4-6', time: '09.35 - 12.10', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'SURYO HADI WIRA PRABOWO' },
    { code: 'UNIV236010', course: 'Manajemen Inovasi', day: id ? 'SELASA' : 'TUESDAY', sessions: '7-9', time: '13.10 - 15.45', room: 'A20-516 Ged A20 OFFR G4-G4 (sementara T - D4)', lecturer: '-' },
    { code: 'NMNJ236035', course: 'Riset Pasar', day: id ? 'KAMIS' : 'THURSDAY', sessions: '7-9', time: '13.10 - 15.45', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI' },
    { code: 'NMNJ236032', course: 'Penelitian dan Seminar Pemasaran', day: id ? 'JUMAT' : 'FRIDAY', sessions: '4-6', time: '09.35 - 12.10', room: 'D12.204 Ged D12 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI' },
    { code: 'NMNJ236043', course: 'Perencanaan Pemasaran', day: id ? 'JUMAT' : 'FRIDAY', sessions: '10-12', time: '15.45 - 18.55', room: 'D8.106 Ged D8 OFFR B-MP2', lecturer: 'AGUS HERMAWAN' },
    { code: 'NMNJ236111', course: 'Tugas Akhir', day: '-', sessions: '-', time: 'Bimbingan', room: '-', lecturer: '-' },
  ];

  return (
    <Shell title={id ? 'Jadwal Kuliah' : 'Class Schedule'} quickFab={false}>
      <div style={{ display: 'grid', gap: '20px', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>SEMESTER 7</h2>
          <span className='pill'>{id ? 'Jadwal Kuliah' : 'Class Schedule'}</span>
        </div>

        <div className='card' style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' }} tabIndex={0} aria-label={id ? 'Tabel jadwal kuliah, geser secara horizontal untuk melihat semua kolom' : 'Class schedule table, scroll horizontally to see all columns'}>
            <table style={{ width: '100%', minWidth: '980px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600, width: '12%' }}>{id ? 'KODE' : 'CODE'}</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600, width: '25%' }}>{id ? 'MATA KULIAH' : 'COURSE'}</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'HARI' : 'DAY'}</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'JAM KE' : 'SESSIONS'}</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'WAKTU' : 'TIME'}</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'RUANG' : 'ROOM'}</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>{id ? 'DOSEN' : 'LECTURER'}</th>
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
