// ponytail: shared semester snapshot; replace with official course data when available.
export function getStudySchedule(id: boolean) {
  return [
    { code: 'NMNJ236034', course: 'Data Sains Untuk Analitik Pemasaran', day: id ? 'SENIN' : 'MONDAY', sessions: '4-6', time: '09.35 - 12.10', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'SURYO HADI WIRA PRABOWO' },
    { code: 'UNIV236010', course: 'Manajemen Inovasi', day: id ? 'SELASA' : 'TUESDAY', sessions: '7-9', time: '13.10 - 15.45', room: 'A20-516 Ged A20 OFFR G4-G4 (sementara T - D4)', lecturer: '-' },
    { code: 'NMNJ236035', course: 'Riset Pasar', day: id ? 'KAMIS' : 'THURSDAY', sessions: '7-9', time: '13.10 - 15.45', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI' },
    { code: 'NMNJ236032', course: 'Penelitian dan Seminar Pemasaran', day: id ? 'JUMAT' : 'FRIDAY', sessions: '4-6', time: '09.35 - 12.10', room: 'D12.204 Ged D12 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI' },
    { code: 'NMNJ236043', course: 'Perencanaan Pemasaran', day: id ? 'JUMAT' : 'FRIDAY', sessions: '10-12', time: '15.45 - 18.55', room: 'D8.106 Ged D8 OFFR B-MP2', lecturer: 'AGUS HERMAWAN' },
    { code: 'NMNJ236111', course: 'Tugas Akhir', day: '-', sessions: '-', time: 'Bimbingan', room: '-', lecturer: '-' },
  ];
}
