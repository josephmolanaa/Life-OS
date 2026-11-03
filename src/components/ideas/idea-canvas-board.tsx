'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { IdeaNode, IdeaEdge, IdeaNodeType } from '@/lib/ideas-types';
import { CANVAS_COLUMNS } from '@/lib/ideas-storage';
import {
  Skull,
  ShieldCheck,
  Columns,
  CheckCircle2,
  Clock,
  CircleDashed,
  Lightbulb,
  MousePointer2,
  Hand,
  Spline,
  SquarePlus,
  Eraser,
  ZoomIn,
  ZoomOut,
  Scan,
} from 'lucide-react';

export type CanvasToolMode = 'select' | 'hand' | 'connect' | 'note' | 'eraser';

// Single source for block names, colors and icons (palette, board and inspector).
export const NODE_TYPES: Record<IdeaNodeType, { label: string; lane: string; hint: string; color: string; Icon: React.ElementType }> = {
  hero: { label: 'Ide utama', lane: 'Ide utama', hint: 'Masalah dan konsep inti', color: 'var(--ic-hero)', Icon: Lightbulb },
  failure: { label: 'Kill factor', lane: 'Cara ide ini gagal', hint: 'Skenario yang membunuh ide', color: 'var(--ic-failure)', Icon: Skull },
  mitigation: { label: 'Mitigasi', lane: 'Cara mencegahnya', hint: 'Kontrol untuk tiap kill factor', color: 'var(--ic-mitigation)', Icon: ShieldCheck },
  pillar: { label: 'Pilar', lane: 'Yang harus benar', hint: 'Asumsi dan kapabilitas kunci', color: 'var(--ic-pillar)', Icon: Columns },
  gate: { label: 'Gate', lane: 'Bukti yang dicari', hint: 'Tes yang harus lolos', color: 'var(--ic-gate)', Icon: CheckCircle2 },
};
export const NODE_TYPE_ORDER: IdeaNodeType[] = ['hero', 'failure', 'mitigation', 'pillar', 'gate'];

interface IdeaCanvasBoardProps {
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  onUpdateNodes: (nodes: IdeaNode[]) => void;
  onUpdateEdges: (edges: IdeaEdge[]) => void;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectEdge: (id: string | null) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onAddNode?: (type: IdeaNodeType, customPos?: { x: number; y: number }) => void;
  onDeleteNode?: (id: string) => void;
  onDeleteEdge?: (id: string) => void;
}

const clampZoom = (z: number) => Math.min(2, Math.max(0.3, Number(z.toFixed(2))));

export function IdeaCanvasBoard({
  nodes,
  edges,
  onUpdateNodes,
  onUpdateEdges,
  selectedNodeId,
  selectedEdgeId,
  onSelectNode,
  onSelectEdge,
  zoom,
  onZoomChange,
  onAddNode,
  onDeleteNode,
  onDeleteEdge,
}: IdeaCanvasBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTool, setActiveTool] = useState<CanvasToolMode>('select');
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const [noteType, setNoteType] = useState<IdeaNodeType>('failure');
  const [connectSourceNodeId, setConnectSourceNodeId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 40, y: 24 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectingFrom, setConnectingFrom] = useState<{ nodeId: string; side: 'left' | 'right' } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // Measured card heights so edges attach to the real vertical center.
  const [heights, setHeights] = useState<Record<string, number>>({});
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const next: Record<string, number> = {};
    for (const n of nodes) next[n.id] = nodeRefs.current[n.id]?.offsetHeight || 120;
    setHeights((prev) => (nodes.every((n) => prev[n.id] === next[n.id]) ? prev : next));
  }, [nodes]);

  const removeNode = useCallback(
    (id: string) => {
      if (onDeleteNode) return onDeleteNode(id);
      onUpdateNodes(nodes.filter((n) => n.id !== id));
      onUpdateEdges(edges.filter((ed) => ed.fromNodeId !== id && ed.toNodeId !== id));
    },
    [nodes, edges, onDeleteNode, onUpdateNodes, onUpdateEdges]
  );
  const removeEdge = useCallback(
    (id: string) => (onDeleteEdge ? onDeleteEdge(id) : onUpdateEdges(edges.filter((ed) => ed.id !== id))),
    [edges, onDeleteEdge, onUpdateEdges]
  );
  const addEdge = (fromNodeId: string, toNodeId: string) => {
    if (fromNodeId === toNodeId) return;
    if (edges.some((e) => e.fromNodeId === fromNodeId && e.toNodeId === toNodeId)) return;
    const from = nodes.find((n) => n.id === fromNodeId);
    const edge: IdeaEdge = { id: `e-${Date.now()}`, fromNodeId, toNodeId, color: from?.color, style: 'solid', hasArrow: true };
    onUpdateEdges([...edges, edge]);
    onSelectEdge(edge.id);
  };

  const pickTool = (tool: CanvasToolMode) => {
    setActiveTool(tool);
    setConnectSourceNodeId(null);
  };

  const laneBottom = useMemo(() => (nodes.length ? Math.max(...nodes.map((n) => n.y)) + 400 : 900), [nodes]);

  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
    },
    [pan, zoom]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!e.repeat) setIsSpaceHeld(true);
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'v') pickTool('select');
      else if (key === 'h') pickTool('hand');
      else if (key === 'c') pickTool('connect');
      else if (key === 'n') pickTool('note');
      else if (key === 'e') pickTool('eraser');
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) { removeNode(selectedNodeId); onSelectNode(null); }
        else if (selectedEdgeId) { removeEdge(selectedEdgeId); onSelectEdge(null); }
      } else if (e.key === 'Escape') {
        onSelectNode(null);
        onSelectEdge(null);
        pickTool('select');
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { if (e.code === 'Space') setIsSpaceHeld(false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [selectedNodeId, selectedEdgeId, removeNode, removeEdge, onSelectNode, onSelectEdge]);

  // Native non-passive wheel listener so preventDefault works; ctrl/pinch or plain wheel zooms around the cursor.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.shiftKey) { setPan((p) => ({ x: p.x - e.deltaY, y: p.y })); return; }
      const rect = el.getBoundingClientRect();
      const next = clampZoom(zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      setPan((p) => ({ x: cx - ((cx - p.x) / zoom) * next, y: cy - ((cy - p.y) / zoom) * next }));
      onZoomChange(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, onZoomChange]);

  const handOn = activeTool === 'hand' || isSpaceHeld;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || handOn) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }
    if (activeTool === 'note' && onAddNode) {
      onAddNode(noteType, screenToCanvas(e.clientX, e.clientY));
      pickTool('select');
      return;
    }
    // Background click: deselect and pan.
    onSelectNode(null);
    onSelectEdge(null);
    setConnectSourceNodeId(null);
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const p = screenToCanvas(e.clientX, e.clientY);
    if (connectingFrom || connectSourceNodeId) setMousePos(p);
    if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    else if (draggingNodeId) {
      onUpdateNodes(nodes.map((n) => (n.id === draggingNodeId ? { ...n, x: Math.round(p.x - dragOffset.x), y: Math.round(p.y - dragOffset.y) } : n)));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingFrom(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: IdeaNode) => {
    if (handOn || e.button !== 0) return; // let it bubble to pan
    e.stopPropagation();
    if (activeTool === 'eraser') return removeNode(node.id);
    if (activeTool === 'connect') {
      if (!connectSourceNodeId) {
        setConnectSourceNodeId(node.id);
        setMousePos(screenToCanvas(e.clientX, e.clientY));
      } else if (connectSourceNodeId !== node.id) {
        addEdge(connectSourceNodeId, node.id);
        pickTool('select');
      }
      return;
    }
    if (activeTool === 'note') return;
    onSelectNode(node.id);
    onSelectEdge(null);
    const p = screenToCanvas(e.clientX, e.clientY);
    setDraggingNodeId(node.id);
    setDragOffset({ x: p.x - node.x, y: p.y - node.y });
  };

  const handleEdgeMouseDown = (e: React.MouseEvent, edge: IdeaEdge) => {
    if (handOn) return;
    e.stopPropagation();
    if (activeTool === 'eraser') return removeEdge(edge.id);
    onSelectEdge(edge.id);
    onSelectNode(null);
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, side: 'left' | 'right') => {
    if (handOn) return;
    e.stopPropagation();
    setConnectingFrom({ nodeId, side });
    setMousePos(screenToCanvas(e.clientX, e.clientY));
  };
  const handlePortMouseUp = (e: React.MouseEvent, toNodeId: string) => {
    e.stopPropagation();
    if (connectingFrom) addEdge(connectingFrom.nodeId, toNodeId);
    setConnectingFrom(null);
  };
  const handleNodeMouseUp = (node: IdeaNode) => {
    // Dropping a wire anywhere on a card connects it.
    if (connectingFrom) addEdge(connectingFrom.nodeId, node.id);
  };

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const port = (node: IdeaNode, side: 'left' | 'right') => ({
    x: side === 'left' ? node.x : node.x + node.width,
    y: node.y + (heights[node.id] || 120) / 2,
  });
  const curve = (a: { x: number; y: number }, aSide: 'left' | 'right', b: { x: number; y: number }, bSide: 'left' | 'right') => {
    const dx = Math.max(48, Math.abs(b.x - a.x) * 0.5);
    const c1 = aSide === 'right' ? a.x + dx : a.x - dx;
    const c2 = bSide === 'left' ? b.x - dx : b.x + dx;
    return `M ${a.x} ${a.y} C ${c1} ${a.y}, ${c2} ${b.y}, ${b.x} ${b.y}`;
  };

  const fitView = () => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || nodes.length === 0) { setPan({ x: 40, y: 24 }); onZoomChange(1); return; }
    const minX = Math.min(...nodes.map((n) => n.x));
    const maxX = Math.max(...nodes.map((n) => n.x + n.width));
    const minY = Math.min(...nodes.map((n) => n.y), 24);
    const maxY = Math.max(...nodes.map((n) => n.y + (heights[n.id] || 120)));
    const pad = 48;
    const next = clampZoom(Math.min(1, (rect.width - pad * 2) / (maxX - minX), (rect.height - pad * 2 - 64) / (maxY - minY)));
    setPan({ x: pad - minX * next, y: pad - minY * next });
    onZoomChange(next);
  };

  const wiring = connectingFrom || connectSourceNodeId;
  const boardClass = [
    'ic-board',
    handOn ? 'tool-hand' : `tool-${activeTool}`,
    isPanning ? 'panning' : '',
    wiring ? 'wiring' : '',
  ].join(' ');

  const tools: { id: CanvasToolMode; label: string; key: string; Icon: React.ElementType }[] = [
    { id: 'select', label: 'Pilih dan pindahkan', key: 'V', Icon: MousePointer2 },
    { id: 'hand', label: 'Geser kanvas', key: 'H', Icon: Hand },
    { id: 'connect', label: 'Sambungkan dua blok', key: 'C', Icon: Spline },
    { id: 'note', label: 'Taruh blok di kanvas', key: 'N', Icon: SquarePlus },
    { id: 'eraser', label: 'Hapus blok atau garis', key: 'E', Icon: Eraser },
  ];

  return (
    <div
      ref={containerRef}
      className={boardClass}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ backgroundSize: `${24 * zoom}px ${24 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}
    >
      <div className="ic-stage" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
        {NODE_TYPE_ORDER.map((type) => {
          const col = CANVAS_COLUMNS[type];
          const meta = NODE_TYPES[type];
          return (
            <div key={type} className="ic-lane" style={{ left: col.x, width: col.width, '--lane': meta.color } as React.CSSProperties}>
              <div className="ic-laneHead">
                <b>{meta.lane}</b>
                <em>{nodes.filter((n) => n.type === type).length}</em>
              </div>
              <div style={{ height: laneBottom, borderLeft: '1px dashed var(--border2)', marginLeft: -1 }} />
            </div>
          );
        })}

        <svg>
          <defs>
            <marker id="ic-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="context-stroke" />
            </marker>
          </defs>
          {edges.map((edge) => {
            const from = nodeById.get(edge.fromNodeId);
            const to = nodeById.get(edge.toNodeId);
            if (!from || !to) return null;
            const forward = from.x <= to.x;
            const d = curve(port(from, forward ? 'right' : 'left'), forward ? 'right' : 'left', port(to, forward ? 'left' : 'right'), forward ? 'left' : 'right');
            const selected = selectedEdgeId === edge.id;
            const color = selected ? 'var(--accent)' : edge.color || 'var(--text2)';
            return (
              <g key={edge.id}>
                <path className="ic-edgeHit" d={d} fill="none" stroke="transparent" strokeWidth={16} onMouseDown={(e) => handleEdgeMouseDown(e, edge)} />
                <path
                  className="ic-edge"
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeOpacity={selected ? 1 : 0.7}
                  strokeWidth={selected ? 2.5 : 1.5}
                  strokeDasharray={edge.style === 'dashed' ? '6 5' : undefined}
                  markerEnd={edge.hasArrow ? 'url(#ic-arrow)' : undefined}
                  onMouseDown={(e) => handleEdgeMouseDown(e, edge)}
                />
              </g>
            );
          })}
          {(() => {
            const sourceId = connectingFrom?.nodeId || connectSourceNodeId;
            const source = sourceId ? nodeById.get(sourceId) : undefined;
            if (!source) return null;
            const side = connectingFrom?.side || (mousePos.x >= source.x + source.width / 2 ? 'right' : 'left');
            return <path d={curve(port(source, side), side, mousePos, side === 'right' ? 'left' : 'right')} fill="none" stroke="var(--accent)" strokeWidth={2} strokeDasharray="6 5" />;
          })()}
        </svg>

        {nodes.map((node) => {
          const meta = NODE_TYPES[node.type];
          const Icon = meta.Icon;
          const cls = ['ic-node', selectedNodeId === node.id ? 'selected' : '', connectSourceNodeId === node.id ? 'source' : ''].join(' ');
          const StatusIcon = node.status === 'completed' ? CheckCircle2 : node.status === 'in_progress' ? Clock : CircleDashed;
          return (
            <div
              key={node.id}
              ref={(el) => { nodeRefs.current[node.id] = el; }}
              className={cls}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onMouseUp={() => handleNodeMouseUp(node)}
              style={{ transform: `translate(${node.x}px, ${node.y}px)`, width: node.width, '--node': node.type === 'hero' ? meta.color : node.color || meta.color } as React.CSSProperties}
            >
              <div className="ic-nodeType">
                <Icon size={14} />
                <span>{node.categoryLabel ? node.categoryLabel.toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : meta.label}</span>
                {node.readinessScore !== undefined && <em>{node.readinessScore}%</em>}
              </div>
              <h3>{node.title}</h3>
              {node.subtitle && <p>{node.subtitle}</p>}
              {node.type === 'gate' && node.statusLabel && (
                <span className={`ic-status ${node.status || ''}`}>
                  <StatusIcon size={12} />
                  {node.status === 'completed' ? 'Lolos' : node.status === 'in_progress' ? 'Sedang diuji' : 'Belum diuji'}
                </span>
              )}
              <div className="ic-port left" onMouseDown={(e) => handlePortMouseDown(e, node.id, 'left')} onMouseUp={(e) => handlePortMouseUp(e, node.id)} />
              <div className="ic-port right" onMouseDown={(e) => handlePortMouseDown(e, node.id, 'right')} onMouseUp={(e) => handlePortMouseUp(e, node.id)} />
            </div>
          );
        })}
      </div>

      <div className="ic-toolbar" onMouseDown={(e) => e.stopPropagation()}>
        {tools.map(({ id, label, key, Icon }) => (
          <button
            key={id}
            type="button"
            className={`ic-btn ${activeTool === id && !isSpaceHeld ? 'on' : ''} ${id === 'eraser' ? 'danger' : ''}`}
            onClick={() => pickTool(id)}
            title={`${label} (${key})`}
            aria-label={label}
            aria-pressed={activeTool === id}
          >
            <Icon size={17} />
          </button>
        ))}
        {activeTool === 'note' && (
          <select value={noteType} onChange={(e) => setNoteType(e.target.value as IdeaNodeType)} aria-label="Jenis blok">
            {NODE_TYPE_ORDER.map((t) => <option key={t} value={t}>{NODE_TYPES[t].label}</option>)}
          </select>
        )}
        <div className="ic-divider" />
        <button type="button" className="ic-btn" onClick={() => onZoomChange(clampZoom(zoom / 1.2))} title="Perkecil" aria-label="Perkecil"><ZoomOut size={17} /></button>
        <button type="button" className="ic-zoom" onClick={() => onZoomChange(1)} title="Kembali ke 100%">{Math.round(zoom * 100)}%</button>
        <button type="button" className="ic-btn" onClick={() => onZoomChange(clampZoom(zoom * 1.2))} title="Perbesar" aria-label="Perbesar"><ZoomIn size={17} /></button>
        <button type="button" className="ic-btn" onClick={fitView} title="Tampilkan semua blok" aria-label="Tampilkan semua blok"><Scan size={17} /></button>
      </div>

      {activeTool === 'connect' && (
        <div className="ic-modeHint" onMouseDown={(e) => e.stopPropagation()}>
          {connectSourceNodeId ? 'Klik blok tujuan' : 'Klik blok asal'}
          <button type="button" onClick={() => pickTool('select')}>Selesai</button>
        </div>
      )}
      {activeTool === 'note' && (
        <div className="ic-modeHint" onMouseDown={(e) => e.stopPropagation()}>
          Klik kanvas untuk menaruh {NODE_TYPES[noteType].label.toLowerCase()}
          <button type="button" onClick={() => pickTool('select')}>Batal</button>
        </div>
      )}
      {activeTool === 'eraser' && (
        <div className="ic-modeHint danger" onMouseDown={(e) => e.stopPropagation()}>
          Klik blok atau garis untuk menghapus
          <button type="button" onClick={() => pickTool('select')}>Selesai</button>
        </div>
      )}
    </div>
  );
}
