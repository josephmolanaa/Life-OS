'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Upload, PanelLeft, PanelRight } from 'lucide-react';
import { IdeaCanvas } from '@/lib/ideas-types';
import { ChromeControls } from '@/components/finance/chrome-controls';

interface IdeaTopbarProps {
  canvas: IdeaCanvas;
  onUpdateCanvas: (updates: Partial<IdeaCanvas>) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSaved?: boolean;
  showPalette?: boolean;
  onTogglePalette?: () => void;
  showInspector?: boolean;
  onToggleInspector?: () => void;
}

export function IdeaTopbar({
  canvas,
  onUpdateCanvas,
  onExport,
  onImport,
  isSaved = true,
  showPalette = true,
  onTogglePalette,
  showInspector = true,
  onToggleInspector,
}: IdeaTopbarProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(canvas.title);

  const gates = canvas.nodes.filter((n) => n.type === 'gate');
  const passed = gates.filter((n) => n.status === 'completed').length;
  const readiness = gates.length ? Math.round((passed / gates.length) * 100) : 0;

  const commit = () => {
    setEditing(false);
    if (title.trim()) onUpdateCanvas({ title: title.trim() });
    else setTitle(canvas.title);
  };

  return (
    <header className="ic-topbar">
      <Link href="/ideas" className="ic-btn" title="Kembali ke daftar ide" aria-label="Kembali ke daftar ide">
        <ArrowLeft size={17} />
      </Link>
      {onTogglePalette && (
        <button type="button" className={`ic-btn ${showPalette ? 'on' : ''}`} onClick={onTogglePalette} title="Panel tambah blok" aria-label="Panel tambah blok" aria-pressed={showPalette}>
          <PanelLeft size={17} />
        </button>
      )}

      <div className="ic-title">
        {editing ? (
          <input
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setTitle(canvas.title); setEditing(false); }
            }}
            aria-label="Judul ide"
          />
        ) : (
          <h1 onClick={() => setEditing(true)} title="Klik untuk ganti judul">{canvas.title}</h1>
        )}
      </div>

      <div className="ic-spacer" />

      <div className="ic-meta">
        <span className="ic-optional">Kesiapan <b>{readiness}%</b></span>
        <span className={isSaved ? 'ic-saved' : ''}>{isSaved ? 'Tersimpan' : 'Menyimpan'}</span>
      </div>

      <label className="ic-btn" title="Impor dari file JSON" aria-label="Impor dari file JSON">
        <Upload size={17} />
        <input type="file" accept=".json,application/json" onChange={onImport} />
      </label>
      <button type="button" className="ic-btn" onClick={onExport} title="Ekspor ke file JSON" aria-label="Ekspor ke file JSON">
        <Download size={17} />
      </button>
      {onToggleInspector && (
        <button type="button" className={`ic-btn ${showInspector ? 'on' : ''}`} onClick={onToggleInspector} title="Panel detail" aria-label="Panel detail" aria-pressed={showInspector}>
          <PanelRight size={17} />
        </button>
      )}
      <div className="ic-divider" />
      <ChromeControls />
    </header>
  );
}
