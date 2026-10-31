// ponytail: kept as fallback seed data for study schedule.
export type StudyScheduleItem = {
  code: string;
  course: string;
  day: string;
  sessions?: string | null;
  time?: string | null;
  room?: string | null;
  lecturer?: string | null;
  semester?: string | null;
};

export function getStudySchedule(id: boolean) {
  return defaultStudySchedule.map(item => ({ ...item, day: id ? item.day : item.day.toUpperCase() }));
}

export const defaultStudySchedule: StudyScheduleItem[] = [
  { code: 'NMNJ236034', course: 'Data Sains Untuk Analitik Pemasaran', day: 'SENIN', sessions: '4-6', time: '09.35 - 12.10', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'SURYO HADI WIRA PRABOWO', semester: 'Semester 7' },
  { code: 'UNIV236010', course: 'Manajemen Inovasi', day: 'SELASA', sessions: '7-9', time: '13.10 - 15.45', room: 'A20-516 Ged A20 OFFR G4-G4 (sementara T - D4)', lecturer: null, semester: 'Semester 7' },
  { code: 'NMNJ236035', course: 'Riset Pasar', day: 'KAMIS', sessions: '7-9', time: '13.10 - 15.45', room: 'D9.110 Ged D9 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI', semester: 'Semester 7' },
  { code: 'NMNJ236032', course: 'Penelitian dan Seminar Pemasaran', day: 'JUMAT', sessions: '4-6', time: '09.35 - 12.10', room: 'D12.204 Ged D12 OFFR A-MP1', lecturer: 'TITIS SHINTA DHEWI', semester: 'Semester 7' },
  { code: 'NMNJ236043', course: 'Perencanaan Pemasaran', day: 'JUMAT', sessions: '10-12', time: '15.45 - 18.55', room: 'D8.106 Ged D8 OFFR B-MP2', lecturer: 'AGUS HERMAWAN', semester: 'Semester 7' },
  { code: 'NMNJ236111', course: 'Tugas Akhir', day: '-', sessions: '-', time: 'Bimbingan', room: '-', lecturer: null, semester: 'Semester 7' },
];