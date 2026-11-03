'use client';

import React from 'react';
import { LayoutGrid, PanelLeftClose } from 'lucide-react';
import { IdeaNodeType } from '@/lib/ideas-types';
import { NODE_TYPES, NODE_TYPE_ORDER } from './idea-canvas-board';

interface IdeaPaletteProps {
  onAddNode: (type: IdeaNodeType) => void;
  nodeCounts: Record<IdeaNodeType, number>;
  onAutoLayout?: () => void;
  onClose?: () => void;
}

export function IdeaPalette({ onAddNode, nodeCounts, onAutoLayout, onClose }: IdeaPaletteProps) {
  return (
    <aside className="ic-rail left" aria-label="Tambah blok">
      <div className="ic-railHead">
        <h2><span>Tambah blok</span></h2>
        {onClose && (
          <button type="button" className="ic-btn" onClick={onClose} title="Sembunyikan panel" aria-label="Sembunyikan panel">
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      <div className="ic-railBody">
        <div className="ic-section">
          {NODE_TYPE_ORDER.map((type) => {
            const { label, hint, color, Icon } = NODE_TYPES[type];
            return (
              <button key={type} type="button" className="ic-row" onClick={() => onAddNode(type)} title={`Tambah ${label.toLowerCase()}`}>
                <Icon size={16} style={{ color }} />
                <span>
                  <span className="ic-rowLabel">{label}</span>
                  <small>{hint}</small>
                </span>
                <span className="ic-count">{nodeCounts[type] || ''}</span>
              </button>
            );
          })}
        </div>

        {onAutoLayout && (
          <div className="ic-section">
            <button type="button" className="ic-row" onClick={onAutoLayout}>
              <LayoutGrid size={16} style={{ color: 'var(--text2)' }} />
              <span>
                <span className="ic-rowLabel">Rapikan kanvas</span>
                <small>Susun ulang blok per kolom</small>
              </span>
              <span />
            </button>
          </div>
        )}

        <p className="ic-hint">
          Mulai dari ide utama, tulis cara ide itu bisa gagal, lalu tutup tiap kegagalan dengan mitigasi, pilar, dan gate yang bisa diuji.
        </p>
      </div>
    </aside>
  );
}
