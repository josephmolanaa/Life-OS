'use client';

import { Shell } from '@/components/finance/layout';
import { CheckCircle2 } from 'lucide-react';

export default function RpsPage() {
  const rpsList = [
    { code: 'IF401', course: 'Kecerdasan Buatan (AI)', progress: '65%', topics: ['Pengenalan AI & Search Algorithms', 'Machine Learning Dasar (Scikit-Learn)', 'Neural Networks & PyTorch', 'Deep Learning & LLMs'] },
    { code: 'IF402', course: 'Pemrograman Web Lanjut', progress: '80%', topics: ['Next.js App Router & Server Actions', 'Tailwind CSS & UI Systems', 'Database & Prisma/Supabase', 'API Design & Security'] },
    { code: 'IF403', course: 'Sistem Terdistribusi', progress: '50%', topics: ['Konsep Distributed Systems', 'RPC & gRPC', 'Microservices Architecture', 'Docker & Kubernetes'] },
  ];

  return (
    <Shell title="RPS (Rencana Pembelajaran Semester)" quickFab={false}>
      <div style={{ display: 'grid', gap: '20px' }}>
        {rpsList.map((item, idx) => (
          <div key={idx} className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span className="pill" style={{ marginBottom: '6px', display: 'inline-block' }}>{item.code}</span>
                <h2 style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: 600 }}>{item.course}</h2>
              </div>
              <span className="big" style={{ fontSize: '20px' }}>{item.progress}</span>
            </div>
            <div className="list">
              {item.topics.map((topic, tIdx) => (
                <div key={tIdx} className="item" style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', padding: '10px 0' }}>
                  <CheckCircle2 size={16} style={{ color: 'var(--green)' }} />
                  <span>{topic}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
}