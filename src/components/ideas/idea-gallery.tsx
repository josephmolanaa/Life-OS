'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lightbulb,
  Plus,
  Trash2,
  Calendar,
  ArrowRight,
  Search,
  ShieldCheck,
  X,
  FileSpreadsheet,
  Sparkles,
} from 'lucide-react';
import { IdeaCanvas } from '@/lib/ideas-types';
import {
  loadAllCanvases,
  createStarterCanvas,
  createBlankCanvas,
  saveCanvas,
  deleteCanvas,
} from '@/lib/ideas-storage';

export function IdeaGallery() {
  const router = useRouter();
  const [canvases, setCanvases] = useState<IdeaCanvas[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isClient, setIsClient] = useState(false);

  // New Idea Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [templateType, setTemplateType] = useState<'starter' | 'blank'>('starter');

  useEffect(() => {
    setIsClient(true);
    setCanvases(loadAllCanvases());
  }, []);

  const handleOpenModal = () => {
    setNewTitle('');
    setNewSubtitle('');
    setTemplateType('starter');
    setIsModalOpen(true);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim() || 'Ide Baru Tanpa Judul';
    const subtitle =
      newSubtitle.trim() ||
      (templateType === 'starter'
        ? 'Rancangan inversi risiko dan pilar validasi produk.'
        : 'Deskripsikan hipotesis dan proposisi nilai inti ide.');

    const newCanvas =
      templateType === 'starter'
        ? createStarterCanvas(title, subtitle)
        : createBlankCanvas(title, subtitle);

    saveCanvas(newCanvas);
    setCanvases(loadAllCanvases());
    setIsModalOpen(false);
    router.push(`/ideas/${newCanvas.id}`);
  };

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Hapus canvas ide "${title}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteCanvas(id);
      setCanvases(loadAllCanvases());
    }
  };

  const getReadinessScore = (canvas: IdeaCanvas): number => {
    const gates = canvas.nodes.filter((n) => n.type === 'gate');
    if (gates.length === 0) return 60;
    const completed = gates.filter((n) => n.status === 'completed').length;
    return Math.round((completed / gates.length) * 100);
  };

  const filteredCanvases = useMemo(() => {
    if (!searchQuery.trim()) return canvases;
    const q = searchQuery.toLowerCase();
    return canvases.filter((c) => {
      return (
        c.title.toLowerCase().includes(q) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(q))
      );
    });
  }, [canvases, searchQuery]);

  if (!isClient) return null;

  return (
    <div style={{ display: 'grid', gap: '24px', maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Header Card: Native Life OS standard */}
      <header className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <p className="muted" style={{ letterSpacing: '.32em', fontSize: '11px', textTransform: 'uppercase', margin: '0 0 6px' }}>
              IDEATION & INVERSION
            </p>
            <h1 className="big" style={{ margin: '0 0 6px', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>Ideas & Inversion Lab</span>
              <span className="pill" style={{ fontSize: '11px', fontWeight: 600, padding: '3px 10px' }}>
                {canvases.length} Ide
              </span>
            </h1>
            <p className="muted" style={{ margin: 0, fontSize: '13px' }}>
              Pilih ide untuk membuka kanvas atau buat ide baru untuk memetakan risiko & validasi.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenModal}
            className="btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Plus size={16} />
            <span>Buat Ide Baru</span>
          </button>
        </div>
      </header>

      {/* Search and Counts Filter Bar */}
      {canvases.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text2)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ide yang sudah dibuat..."
              className="input"
              style={{
                paddingLeft: '40px',
                paddingRight: '14px',
                height: '42px',
                fontSize: '13px',
                width: '100%',
              }}
            />
          </div>

          <div className="muted" style={{ fontSize: '12px', letterSpacing: '.05em' }}>
            Menampilkan {filteredCanvases.length} dari {canvases.length} ide
          </div>
        </div>
      )}

      {/* Grid Ide yang Sudah Dibuat / Empty State */}
      {filteredCanvases.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '64px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--surface2)',
              border: '1px solid var(--border2)',
              color: 'var(--text2)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Lightbulb size={28} />
          </div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
            {canvases.length === 0 ? 'Belum Ada Ide yang Dibuat' : 'Ide Tidak Ditemukan'}
          </h2>
          <p className="muted" style={{ margin: 0, fontSize: '13px', maxWidth: '420px', lineHeight: '1.6' }}>
            {canvases.length === 0
              ? 'Mulai dengan membuat ide baru untuk membuka workspace kanvas inversi Charlie Munger.'
              : `Tidak ada ide yang cocok dengan pencarian "${searchQuery}".`}
          </p>
          <div style={{ marginTop: '8px' }}>
            {canvases.length === 0 ? (
              <button
                type="button"
                onClick={handleOpenModal}
                className="btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
                <span>Buat Ide Pertama</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="btn ghost"
                style={{ padding: '8px 18px', fontSize: '13px', cursor: 'pointer' }}
              >
                Reset Pencarian
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '20px' }}>
          {filteredCanvases.map((canvas) => {
            const failures = canvas.nodes.filter((n) => n.type === 'failure').length;
            const mitigations = canvas.nodes.filter((n) => n.type === 'mitigation').length;
            const gates = canvas.nodes.filter((n) => n.type === 'gate').length;
            const readiness = getReadinessScore(canvas);

            return (
              <Link
                key={canvas.id}
                href={`/ideas/${canvas.id}`}
                className="card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '20px',
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Top Row: Icon + Title + Delete button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', minWidth: 0 }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: 'var(--surface2)',
                          border: '1px solid var(--border2)',
                          color: 'var(--accent)',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Lightbulb size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <h2
                          style={{
                            margin: 0,
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {canvas.title}
                        </h2>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            color: 'var(--text2)',
                            marginTop: '4px',
                          }}
                        >
                          <Calendar size={13} />
                          <span>
                            {new Date(canvas.updatedAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, canvas.id, canvas.title)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text3)',
                        padding: '6px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        transition: 'color 0.15s, background 0.15s',
                      }}
                      title="Hapus kanvas ide"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--red)';
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text3)';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Subtitle / Hypothesis */}
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      lineHeight: '1.6',
                      minHeight: '42px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {canvas.subtitle || 'Belum ada deskripsi hipotesis tertulis.'}
                  </p>

                  {/* Readiness Meter */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                        <ShieldCheck size={14} className="positive" />
                        Kesiapan Ide
                      </span>
                      <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)' }}>
                        {readiness}%
                      </span>
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '6px',
                        borderRadius: '999px',
                        background: 'var(--surface2)',
                        overflow: 'hidden',
                        border: '1px solid var(--border2)',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: '999px',
                          width: `${readiness}%`,
                          backgroundColor:
                            readiness >= 70
                              ? 'var(--green)'
                              : readiness >= 40
                              ? '#F59E0B'
                              : 'var(--red)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer: Badges with generous gap + Open indicator */}
                <div
                  style={{
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border2)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--surface2)',
                        color: 'var(--red)',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid var(--border2)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {failures} Gagal
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--surface2)',
                        color: 'var(--green)',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid var(--border2)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {mitigations} Mitigasi
                    </span>
                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        background: 'var(--surface2)',
                        color: 'var(--text2)',
                        fontSize: '11px',
                        fontWeight: 600,
                        border: '1px solid var(--border2)',
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      {gates} Gate
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: 'var(--text2)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>Buka</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'grid',
            placeItems: 'center',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="card"
            style={{
              width: 'min(94vw, 520px)',
              padding: '28px',
              borderRadius: '16px',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '14px',
                borderBottom: '1px solid var(--border2)',
                paddingBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border2)',
                    color: 'var(--accent)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Lightbulb size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: 'var(--text)' }}>
                    Buat Ide Baru
                  </h2>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: '12px' }}>
                    Siapkan kanvas inversi untuk mengeksplorasi ide Anda
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn ghost"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: 0,
                  borderRadius: '8px',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleConfirmCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  Judul Ide <span style={{ color: 'var(--red)' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Contoh: Midnight Diner Tycoon, B2B Micro-Automation..."
                  className="input"
                  style={{ padding: '10px 14px', fontSize: '13px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  Hipotesis / Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Apa masalah yang diselesaikan dan proposisi nilai utamanya?"
                  className="input"
                  style={{ padding: '10px 14px', fontSize: '13px', resize: 'none', width: '100%' }}
                />
              </div>

              {/* Template Choice */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                  Format Awal
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setTemplateType('starter')}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: templateType === 'starter' ? '2px solid var(--accent)' : '1px solid var(--border2)',
                      background: templateType === 'starter' ? 'var(--surface2)' : 'var(--surface)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Template Lengkap</span>
                      <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: '11px', lineHeight: '1.5' }}>
                      5 kolom terstruktur (Ide, Kill Factors, Mitigasi, Pilar, Gate).
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTemplateType('blank')}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      border: templateType === 'blank' ? '2px solid var(--accent)' : '1px solid var(--border2)',
                      background: templateType === 'blank' ? 'var(--surface2)' : 'var(--surface)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Kanvas Kosong</span>
                      <FileSpreadsheet size={14} style={{ color: 'var(--text2)' }} />
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: '11px', lineHeight: '1.5' }}>
                      Mulai dari kanvas kosong dengan satu node Ide Utama.
                    </p>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--border2)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn ghost"
                  style={{ padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 20px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <span>Buka Kanvas</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
