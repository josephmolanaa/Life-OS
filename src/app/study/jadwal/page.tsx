import { Shell } from '@/components/finance/layout';

export default function JadwalPage() {
  const schedule = [
    { code: 'NMNJ236034', course: 'Data Sains Untuk Analitik Pemasaran', day: 'SENIN', sessions: '4-6', time: '09.35 - 12.10', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'SURYO HADI WIRA PRABOWO' },
    { code: 'UNIV236010', course: 'Manajemen Inovasi', day: 'SELASA', sessions: '7-9', time: '13.10 - 15.45', room: 'A20-516 Ged A20 OFFR G4-G4 (sementara T - D4)', lecturer: '-' },
    { code: 'NMNJ236035', course: 'Riset Pasar', day: 'KAMIS', sessions: '7-9', time: '13.10 - 15.45', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI' },
    { code: 'NMNJ236032', course: 'Penelitian dan Seminar Pemasaran', day: 'JUMAT', sessions: '4-6', time: '09.35 - 12.10', room: 'D12.204 Ged D12 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI' },
    { code: 'NMNJ236043', course: 'Perencanaan Pemasaran', day: 'JUMAT', sessions: '10-12', time: '15.45 - 18.55', room: 'D8.106 Ged D8 OFFR B-MP2', lecturer: 'AGUS HERMAWAN' },
    { code: 'NMNJ236111', course: 'Tugas Akhir', day: '-', sessions: '-', time: 'Bimbingan', room: '-', lecturer: '-' },
  ];

  return (
    <Shell title='Jadwal Kuliah' quickFab={false}>
      <div style={{ display: 'grid', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>SEMESTER 7</h2>
          <span className='pill'>Jadwal Kuliah</span>
        </div>

        <div className='card' style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600, width: '12%' }}>KODE</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600, width: '25%' }}>MATA KULIAH</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>HARI</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>JAM KE</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>WAKTU</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>RUANG</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text2)', fontWeight: 600 }}>DOSEN</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border2)' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'DM Mono, monospace', fontSize: '13px', color: 'var(--text2)' }}>{item.code}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--text)' }}>{item.course}</td>
                    <td style={{ padding: '14px 16px' }}><span className='pill'>{item.day}</span></td>
                    <td style={{ padding: '14px 16px', fontFamily: 'DM Mono, monospace' }}>{item.sessions}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{item.time}</td>
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
