'use client';

import React, { useState } from 'react';
import { PanelRightClose, X, Trash2, Copy, CheckCircle2, Clock, CircleDashed, Plus } from 'lucide-react';
import { IdeaNode, IdeaEdge, IdeaNodeType } from '@/lib/ideas-types';
import { NODE_TYPES, NODE_TYPE_ORDER } from './idea-canvas-board';

interface IdeaInspectorProps {
  selectedNode: IdeaNode | null;
  selectedEdge: IdeaEdge | null;
  onUpdateNode: (updates: Partial<IdeaNode>) => void;
  onDeleteNode: (id: string) => void;
  onDuplicateNode: (node: IdeaNode) => void;
  onUpdateEdge: (updates: Partial<IdeaEdge>) => void;
  onDeleteEdge: (id: string) => void;
  onClose: () => void;
  nodes?: IdeaNode[];
  edges?: IdeaEdge[];
  onAutoLayout?: () => void;
  onAddNode?: (type: IdeaNodeType) => void;
  onCreateEdge?: (fromId: string, toId: string) => void;
}

const SWATCHES = ['#E5484D', '#30A46C', '#8E4EC6', '#E9A23B', '#3E63DD', '#8B8D98'];

function Rail({ title, dot, closeLabel, onClose, children }: { title: string; dot?: string; closeLabel: string; onClose: () => void; children: React.ReactNode }) {
  const Close = closeLabel === 'Sembunyikan panel' ? PanelRightClose : X;
  return (
    <aside className="ic-rail right" aria-label={title}>
      <div className="ic-railHead">
        <h2>
          {dot && <i style={{ width: 8, height: 8, borderRadius: 999, background: dot, flex: 'none' }} />}
          <span>{title}</span>
        </h2>
        <button type="button" className="ic-btn" onClick={onClose} title={closeLabel} aria-label={closeLabel}>
          <Close size={16} />
        </button>
      </div>
      <div className="ic-railBody">{children}</div>
    </aside>
  );
}

export function IdeaInspector({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
  onUpdateEdge,
  onDeleteEdge,
  onClose,
  nodes = [],
  edges = [],
  onCreateEdge,
}: IdeaInspectorProps) {
  const [connectTargetId, setConnectTargetId] = useState('');

  // Nothing selected: what is left to prove.
  if (!selectedNode && !selectedEdge) {
    const gates = nodes.filter((n) => n.type === 'gate');
    const passed = gates.filter((n) => n.status === 'completed').length;
    const readiness = gates.length ? Math.round((passed / gates.length) * 100) : 0;
    const failures = nodes.filter((n) => n.type === 'failure');
    const typeOf = (id: string) => nodes.find((n) => n.id === id)?.type;
    const unmitigated = failures.filter(
      (f) => !edges.some((e) => (e.fromNodeId === f.id && typeOf(e.toNodeId) === 'mitigation') || (e.toNodeId === f.id && typeOf(e.fromNodeId) === 'mitigation'))
    ).length;

    return (
      <Rail title="Ringkasan" closeLabel="Sembunyikan panel" onClose={onClose}>
        <div className="ic-section">
          <div className="ic-sectionTitle"><span>Kesiapan</span><span>{passed} dari {gates.length} gate lolos</span></div>
          <div className="ic-big">{readiness}%</div>
          <div className="ic-meter"><i style={{ width: `${readiness}%` }} /></div>
        </div>

        {gates.length > 0 && (
          <div className="ic-section">
            <div className="ic-sectionTitle"><span>Gate</span></div>
            {gates.map((g) => {
              const Icon = g.status === 'completed' ? CheckCircle2 : g.status === 'in_progress' ? Clock : CircleDashed;
              const color = g.status === 'completed' ? 'var(--green)' : g.status === 'in_progress' ? 'var(--ic-gate)' : 'var(--text2)';
              return (
                <div key={g.id} className="ic-gateRow"><Icon size={14} style={{ color }} /><span>{g.title}</span></div>
              );
            })}
          </div>
        )}

        <div className="ic-section">
          <div className="ic-sectionTitle"><span>Isi kanvas</span></div>
          {NODE_TYPE_ORDER.map((t) => {
            const { label, color, Icon } = NODE_TYPES[t];
            return (
              <div key={t} className="ic-row" style={{ cursor: 'default' }}>
                <Icon size={16} style={{ color }} />
                <span className="ic-rowLabel">{label}</span>
                <span className="ic-count">{nodes.filter((n) => n.type === t).length}</span>
              </div>
            );
          })}
          {unmitigated > 0 && (
            <p className="ic-hint" style={{ paddingTop: 6 }}>
              {unmitigated} kill factor belum tersambung ke mitigasi.
            </p>
          )}
        </div>

        <p className="ic-hint">Pilih blok atau garis untuk mengeditnya. V pilih, H geser, C sambung, N taruh blok, E hapus.</p>
      </Rail>
    );
  }

  if (selectedEdge) {
    const from = nodes.find((n) => n.id === selectedEdge.fromNodeId);
    const to = nodes.find((n) => n.id === selectedEdge.toNodeId);
    return (
      <Rail title="Garis" closeLabel="Batalkan pilihan" onClose={onClose}>
        <p className="ic-hint"><b style={{ color: 'var(--text)' }}>{from?.title}</b> ke <b style={{ color: 'var(--text)' }}>{to?.title}</b></p>

        <div className="ic-field">
          Gaya
          <div className="ic-segment">
            <button type="button" className={selectedEdge.style !== 'dashed' ? 'on' : ''} onClick={() => onUpdateEdge({ style: 'solid' })}>Penuh</button>
            <button type="button" className={selectedEdge.style === 'dashed' ? 'on' : ''} onClick={() => onUpdateEdge({ style: 'dashed' })}>Putus-putus</button>
          </div>
        </div>

        <div className="ic-field">
          Ujung
          <div className="ic-segment">
            <button type="button" className={selectedEdge.hasArrow ? 'on' : ''} onClick={() => onUpdateEdge({ hasArrow: true })}>Panah</button>
            <button type="button" className={!selectedEdge.hasArrow ? 'on' : ''} onClick={() => onUpdateEdge({ hasArrow: false })}>Polos</button>
          </div>
        </div>

        <div className="ic-field">
          Warna
          <div className="ic-swatches">
            {SWATCHES.map((c) => (
              <button key={c} type="button" className={`ic-swatch ${selectedEdge.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => onUpdateEdge({ color: c })} aria-label={`Warna ${c}`} />
            ))}
          </div>
        </div>

        <div className="ic-actions" style={{ gridTemplateColumns: '1fr' }}>
          <button type="button" className="ic-action danger" onClick={() => onDeleteEdge(selectedEdge.id)}><Trash2 size={14} /> Hapus garis</button>
        </div>
      </Rail>
    );
  }

  const node = selectedNode!;
  const meta = NODE_TYPES[node.type];
  const related = edges.filter((e) => e.fromNodeId === node.id || e.toNodeId === node.id);
  const candidates = nodes.filter((n) => n.id !== node.id && !related.some((e) => e.fromNodeId === n.id || e.toNodeId === n.id));
  const num = (v: string, fallback: number) => (Number.isFinite(parseInt(v)) ? parseInt(v) : fallback);

  return (
    <Rail title={meta.label} dot={node.color || meta.color} closeLabel="Batalkan pilihan" onClose={onClose}>
      <label className="ic-field">
        Judul
        <input className="ic-input" value={node.title || ''} onChange={(e) => onUpdateNode({ title: e.target.value })} />
      </label>

      <label className="ic-field">
        Penjelasan
        <textarea className="ic-input" rows={3} value={node.subtitle || ''} onChange={(e) => onUpdateNode({ subtitle: e.target.value })} />
      </label>

      <label className="ic-field">
        Label
        <input className="ic-input" value={node.categoryLabel || ''} placeholder={meta.label} onChange={(e) => onUpdateNode({ categoryLabel: e.target.value })} />
      </label>

      {node.type === 'gate' && (
        <div className="ic-field">
          Status gate
          <div className="ic-segment">
            <button type="button" className={node.status === 'pending' || !node.status ? 'on' : ''} onClick={() => onUpdateNode({ status: 'pending', statusLabel: 'Belum diuji' })}>Belum</button>
            <button type="button" className={node.status === 'in_progress' ? 'on' : ''} onClick={() => onUpdateNode({ status: 'in_progress', statusLabel: 'Sedang diuji' })}>Diuji</button>
            <button type="button" className={node.status === 'completed' ? 'on' : ''} onClick={() => onUpdateNode({ status: 'completed', statusLabel: 'Lolos' })}>Lolos</button>
          </div>
        </div>
      )}

      <div className="ic-field">
        Posisi dan lebar
        <div className="ic-grid3">
          <label><span>X</span><input className="ic-input" type="number" value={Math.round(node.x)} onChange={(e) => onUpdateNode({ x: num(e.target.value, node.x) })} /></label>
          <label><span>Y</span><input className="ic-input" type="number" value={Math.round(node.y)} onChange={(e) => onUpdateNode({ y: num(e.target.value, node.y) })} /></label>
          <label><span>Lebar</span><input className="ic-input" type="number" min={200} max={600} step={10} value={node.width} onChange={(e) => onUpdateNode({ width: Math.max(200, Math.min(600, num(e.target.value, node.width))) })} /></label>
        </div>
      </div>

      <div className="ic-field">
        Warna
        <div className="ic-swatches">
          {SWATCHES.map((c) => (
            <button key={c} type="button" className={`ic-swatch ${node.color === c ? 'on' : ''}`} style={{ background: c }} onClick={() => onUpdateNode({ color: c })} aria-label={`Warna ${c}`} />
          ))}
        </div>
      </div>

      <div className="ic-field">
        Terhubung ke
        {related.length > 0 && (
          <div className="ic-links">
            {related.map((edge) => {
              const out = edge.fromNodeId === node.id;
              const other = nodes.find((n) => n.id === (out ? edge.toNodeId : edge.fromNodeId));
              if (!other) return null;
              return (
                <div key={edge.id} className="ic-link">
                  <em>{out ? 'ke' : 'dari'}</em>
                  <span>{other.title}</span>
                  <button type="button" className="ic-btn" onClick={() => onDeleteEdge(edge.id)} title="Hapus garis" aria-label={`Hapus garis ke ${other.title}`}><X size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
        {onCreateEdge && candidates.length > 0 && (
          <div className="ic-inline">
            <select className="ic-input" value={connectTargetId} onChange={(e) => setConnectTargetId(e.target.value)} aria-label="Blok tujuan">
              <option value="">Pilih blok tujuan</option>
              {NODE_TYPE_ORDER.map((t) => {
                const group = candidates.filter((n) => n.type === t);
                return group.length ? (
                  <optgroup key={t} label={NODE_TYPES[t].label}>
                    {group.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                  </optgroup>
                ) : null;
              })}
            </select>
            <button
              type="button"
              className="ic-action primary"
              disabled={!connectTargetId}
              onClick={() => { onCreateEdge(node.id, connectTargetId); setConnectTargetId(''); }}
              aria-label="Sambungkan"
              title="Sambungkan"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="ic-actions">
        <button type="button" className="ic-action" onClick={() => onDuplicateNode(node)}><Copy size={14} /> Duplikat</button>
        <button type="button" className="ic-action danger" onClick={() => onDeleteNode(node.id)}><Trash2 size={14} /> Hapus</button>
      </div>
    </Rail>
  );
}
