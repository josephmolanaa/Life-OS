import { IdeaCanvas, IdeaNode, IdeaEdge } from './ideas-types';

const STORAGE_KEY = 'lifeos_ideas_canvases';

// Column X coordinates for the 5-stage Charlie Munger Inversion Matrix
export const CANVAS_COLUMNS = {
  hero: { x: 80, width: 300, label: '1. IDE UTAMA', sub: 'Konsep & Masalah Inti' },
  failure: { x: 500, width: 290, label: '2. KILL FACTORS', sub: 'Inversi: Titik Kegagalan Fatal' },
  mitigation: { x: 920, width: 290, label: '3. MITIGASI RISIKO', sub: 'Pencegah & Kontrol Risiko' },
  pillar: { x: 1340, width: 290, label: '4. PILAR FONDASI', sub: 'Asumsi Kunci & Kapabilitas' },
  gate: { x: 1760, width: 290, label: '5. GATE VALIDASI', sub: 'Milestone Bukti Bertahap' },
} as const;

export function createBlankCanvas(title = 'Ide Baru Tanpa Judul', subtitle = 'Deskripsikan hipotesis dan proposisi nilai inti.'): IdeaCanvas {
  const now = new Date().toISOString();
  const heroNode: IdeaNode = {
    id: 'node-hero',
    type: 'hero',
    title,
    subtitle,
    readinessScore: 20,
    x: CANVAS_COLUMNS.hero.x,
    y: 300,
    width: CANVAS_COLUMNS.hero.width,
    color: '#1E293B',
    categoryLabel: 'IDE UTAMA',
  };

  return {
    id: 'idea-' + Date.now(),
    title,
    subtitle,
    step: 1,
    nodes: [heroNode],
    edges: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createStarterCanvas(title = 'Midnight Diner Tycoon', subtitle = 'Simulasi restoran malam lo-fi dengan narasi intimate customer.'): IdeaCanvas {
  const nodes: IdeaNode[] = [
    // Column 1: Ide Utama (Hero)
    {
      id: 'node-hero',
      type: 'hero',
      title,
      subtitle,
      readinessScore: 85,
      x: CANVAS_COLUMNS.hero.x,
      y: 360,
      width: CANVAS_COLUMNS.hero.width,
      color: '#1E293B',
      categoryLabel: 'IDE UTAMA',
    },

    // Column 2: Kill Factors (Inversi) - Gap 120px from Col 1, 240px vertical pitch
    {
      id: 'node-fail-main',
      type: 'failure',
      title: 'Total Churn dalam 14 Hari',
      subtitle: 'Rating drop < 3.5 di app store karena pemain merasa bosan cepat.',
      categoryLabel: 'SKENARIO GAGAL UTAMA',
      x: CANVAS_COLUMNS.failure.x,
      y: 140,
      width: CANVAS_COLUMNS.failure.width,
      color: '#EF4444',
    },
    {
      id: 'node-kill-01',
      type: 'failure',
      title: 'Core loop repetitif',
      subtitle: 'Pemain merasa sudah melihat seluruh variasi permainan setelah 10 menit.',
      statusLabel: 'Kill factor 01',
      categoryLabel: 'KILL FACTOR 01',
      x: CANVAS_COLUMNS.failure.x,
      y: 380,
      width: CANVAS_COLUMNS.failure.width,
      color: '#EF4444',
    },
    {
      id: 'node-kill-02',
      type: 'failure',
      title: 'Mobile terasa sulit',
      subtitle: 'Kontrol dan UI tidak nyaman digunakan di layar berukuran kecil.',
      statusLabel: 'Kill factor 02',
      categoryLabel: 'KILL FACTOR 02',
      x: CANVAS_COLUMNS.failure.x,
      y: 620,
      width: CANVAS_COLUMNS.failure.width,
      color: '#EF4444',
    },

    // Column 3: Mitigasi Risiko - Gap 130px from Col 2, aligning with failures
    {
      id: 'node-mit-01',
      type: 'mitigation',
      title: 'Variasikan sesi pertama',
      subtitle: 'Uji 3 variasi order & random event. Target completion rate > 60%.',
      statusLabel: 'Mitigasi Terencana',
      categoryLabel: 'MITIGASI 01',
      x: CANVAS_COLUMNS.mitigation.x,
      y: 380,
      width: CANVAS_COLUMNS.mitigation.width,
      color: '#10B981',
    },
    {
      id: 'node-mit-02',
      type: 'mitigation',
      title: 'Prototype satu jempol',
      subtitle: 'Tes ergonomi kontrol pada 3 ukuran layar sebelum produksi massal.',
      statusLabel: 'Mitigasi Terencana',
      categoryLabel: 'MITIGASI 02',
      x: CANVAS_COLUMNS.mitigation.x,
      y: 620,
      width: CANVAS_COLUMNS.mitigation.width,
      color: '#10B981',
    },

    // Column 4: Pilar Fondasi - Gap 130px from Col 3, 220px vertical pitch
    {
      id: 'node-pil-01',
      type: 'pillar',
      title: 'Core 30s Loop',
      subtitle: 'Siklus masak & saji cepat tanpa jeda mikir berat bagi pemain.',
      categoryLabel: 'PILAR FONDASI',
      x: CANVAS_COLUMNS.pillar.x,
      y: 120,
      width: CANVAS_COLUMNS.pillar.width,
      color: '#8B5CF6',
    },
    {
      id: 'node-pil-02',
      type: 'pillar',
      title: 'Atmospheric Lo-Fi',
      subtitle: 'Palet visual hangat + ambient sound hujan malam yang menenangkan.',
      categoryLabel: 'PILAR FONDASI',
      x: CANVAS_COLUMNS.pillar.x,
      y: 340,
      width: CANVAS_COLUMNS.pillar.width,
      color: '#8B5CF6',
    },
    {
      id: 'node-pil-03',
      type: 'pillar',
      title: 'Customer Retention',
      subtitle: 'Sistem relasi pelanggan & unlock buku resep rahasia bertahap.',
      categoryLabel: 'PILAR FONDASI',
      x: CANVAS_COLUMNS.pillar.x,
      y: 560,
      width: CANVAS_COLUMNS.pillar.width,
      color: '#8B5CF6',
    },
    {
      id: 'node-pil-04',
      type: 'pillar',
      title: 'Single Thumb Ergonomics',
      subtitle: 'Seluruh interaksi tombol dapat dijangkau satu tangan di mobile.',
      categoryLabel: 'PILAR FONDASI',
      x: CANVAS_COLUMNS.pillar.x,
      y: 780,
      width: CANVAS_COLUMNS.pillar.width,
      color: '#8B5CF6',
    },

    // Column 5: Gate Validasi - Gap 130px from Col 4, 220px vertical pitch
    {
      id: 'node-gate-01',
      type: 'gate',
      title: 'Paper / Greybox Loop',
      subtitle: 'Uji gameplay 10 menit dengan tester internal tanpa aset jadi.',
      categoryLabel: 'GATE 01',
      status: 'completed',
      statusLabel: 'SELESAI (Validasi 10 menit)',
      x: CANVAS_COLUMNS.gate.x,
      y: 120,
      width: CANVAS_COLUMNS.gate.width,
      color: '#10B981',
    },
    {
      id: 'node-gate-02',
      type: 'gate',
      title: 'Mobile Usability Test',
      subtitle: 'Uji kenyamanan navigasi satu tangan pada 5 tester eksternal.',
      categoryLabel: 'GATE 02',
      status: 'in_progress',
      statusLabel: 'SEDANG BERJALAN (5 Tester)',
      x: CANVAS_COLUMNS.gate.x,
      y: 340,
      width: CANVAS_COLUMNS.gate.width,
      color: '#F59E0B',
    },
    {
      id: 'node-gate-03',
      type: 'gate',
      title: 'Vertical Slice (3 Malam)',
      subtitle: 'Kunci kualitas art, audio, dan narasi untuk 3 level pertama.',
      categoryLabel: 'GATE 03',
      status: 'pending',
      statusLabel: 'PENDING (Art & Audio lock)',
      x: CANVAS_COLUMNS.gate.x,
      y: 560,
      width: CANVAS_COLUMNS.gate.width,
      color: '#94A3B8',
    },
    {
      id: 'node-gate-04',
      type: 'gate',
      title: 'Soft Launch Gate',
      subtitle: 'Buka uji coba publik terbatas dengan target retention D1 > 40%.',
      categoryLabel: 'GATE 04',
      status: 'pending',
      statusLabel: 'PENDING (Retention D1 > 40%)',
      x: CANVAS_COLUMNS.gate.x,
      y: 780,
      width: CANVAS_COLUMNS.gate.width,
      color: '#94A3B8',
    },
  ];

  const edges: IdeaEdge[] = [
    { id: 'e1', fromNodeId: 'node-hero', toNodeId: 'node-fail-main', style: 'dashed', color: '#94A3B8' },
    { id: 'e2', fromNodeId: 'node-hero', toNodeId: 'node-kill-01', style: 'solid', color: '#F87171' },
    { id: 'e3', fromNodeId: 'node-hero', toNodeId: 'node-kill-02', style: 'solid', color: '#F87171' },
    { id: 'e4', fromNodeId: 'node-kill-01', toNodeId: 'node-mit-01', style: 'solid', color: '#10B981', hasArrow: true },
    { id: 'e5', fromNodeId: 'node-kill-02', toNodeId: 'node-mit-02', style: 'solid', color: '#10B981', hasArrow: true },
    { id: 'e6', fromNodeId: 'node-mit-01', toNodeId: 'node-pil-01', style: 'solid', color: '#A78BFA' },
    { id: 'e7', fromNodeId: 'node-mit-01', toNodeId: 'node-pil-02', style: 'solid', color: '#A78BFA' },
    { id: 'e8', fromNodeId: 'node-mit-02', toNodeId: 'node-pil-04', style: 'solid', color: '#A78BFA' },
    { id: 'e9', fromNodeId: 'node-pil-01', toNodeId: 'node-gate-01', style: 'solid', color: '#10B981' },
    { id: 'e10', fromNodeId: 'node-pil-02', toNodeId: 'node-gate-02', style: 'solid', color: '#F59E0B' },
    { id: 'e11', fromNodeId: 'node-pil-03', toNodeId: 'node-gate-03', style: 'dashed', color: '#CBD5E1' },
    { id: 'e12', fromNodeId: 'node-pil-04', toNodeId: 'node-gate-04', style: 'dashed', color: '#CBD5E1' },
  ];

  const now = new Date().toISOString();
  return {
    id: 'idea-' + Date.now(),
    title,
    subtitle,
    step: 1,
    nodes,
    edges,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Algorithmic Auto-Layout: reorganizes nodes into clean 5-column Inversion Matrix
 */
export function autoLayoutNodes(nodes: IdeaNode[]): IdeaNode[] {
  const groups: Record<string, IdeaNode[]> = {
    hero: [],
    failure: [],
    mitigation: [],
    pillar: [],
    gate: [],
  };

  nodes.forEach((n) => {
    if (groups[n.type]) {
      groups[n.type].push(n);
    } else {
      groups.hero.push(n);
    }
  });

  const result: IdeaNode[] = [];

  // 1. Hero / Ide Utama: Centered vertically if failure nodes exist
  const heroHeight = groups.failure.length > 0 ? Math.max(260, (groups.failure.length * 240) / 2) : 320;
  groups.hero.forEach((node, i) => {
    result.push({
      ...node,
      x: CANVAS_COLUMNS.hero.x,
      y: heroHeight + i * 240,
      width: CANVAS_COLUMNS.hero.width,
    });
  });

  // 2. Kill Factors (Failure): start y=140, 240px pitch
  groups.failure.forEach((node, i) => {
    result.push({
      ...node,
      x: CANVAS_COLUMNS.failure.x,
      y: 140 + i * 240,
      width: CANVAS_COLUMNS.failure.width,
    });
  });

  // 3. Mitigations: start y=260 (or aligned with failures), 240px pitch
  groups.mitigation.forEach((node, i) => {
    result.push({
      ...node,
      x: CANVAS_COLUMNS.mitigation.x,
      y: 260 + i * 240,
      width: CANVAS_COLUMNS.mitigation.width,
    });
  });

  // 4. Pillars: start y=120, 220px pitch
  groups.pillar.forEach((node, i) => {
    result.push({
      ...node,
      x: CANVAS_COLUMNS.pillar.x,
      y: 120 + i * 220,
      width: CANVAS_COLUMNS.pillar.width,
    });
  });

  // 5. Gates: start y=120, 220px pitch
  groups.gate.forEach((node, i) => {
    result.push({
      ...node,
      x: CANVAS_COLUMNS.gate.x,
      y: 120 + i * 220,
      width: CANVAS_COLUMNS.gate.width,
    });
  });

  return result;
}

export function loadAllCanvases(): IdeaCanvas[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = [createStarterCanvas()];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed: IdeaCanvas[] = JSON.parse(raw);
    let modified = false;
    const upgraded = parsed.map((c) => {
      // Auto-migrate legacy cramped canvases where x coordinates are too close
      // (e.g. node-kill-01 x <= 440 or x === 310 or width <= 280)
      const isCramped = c.nodes && c.nodes.some(
        (n) => (n.id === 'node-kill-01' && n.x <= 450) || (n.id === 'node-mit-01' && n.x <= 800) || (n.width && n.width < 290)
      );

      if (isCramped) {
        // Upgrade starter canvas coordinates while preserving custom titles
        const fresh = createStarterCanvas(c.title, c.subtitle);
        fresh.id = c.id;
        fresh.createdAt = c.createdAt;
        modified = true;
        return fresh;
      }
      return c;
    });
    if (modified) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    }
    return upgraded;
  } catch (err) {
    console.error('Failed to load canvases:', err);
    return [];
  }
}

export function loadCanvasById(id: string): IdeaCanvas | null {
  const all = loadAllCanvases();
  return all.find(c => c.id === id) || null;
}

export function saveCanvas(canvas: IdeaCanvas): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadAllCanvases();
    const index = all.findIndex(c => c.id === canvas.id);
    if (index >= 0) {
      all[index] = { ...canvas, updatedAt: new Date().toISOString() };
    } else {
      all.unshift({ ...canvas, updatedAt: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to save canvas:', err);
  }
}

export function deleteCanvas(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all = loadAllCanvases().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.error('Failed to delete canvas:', err);
  }
}
