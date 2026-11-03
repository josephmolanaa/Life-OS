'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { IdeaCanvas, IdeaNode, IdeaEdge, IdeaNodeType } from '@/lib/ideas-types';
import {
  loadCanvasById,
  saveCanvas,
  createStarterCanvas,
  autoLayoutNodes,
  CANVAS_COLUMNS,
} from '@/lib/ideas-storage';
import { IdeaTopbar } from '@/components/ideas/idea-topbar';
import { IdeaPalette } from '@/components/ideas/idea-palette';
import { IdeaCanvasBoard } from '@/components/ideas/idea-canvas-board';
import { IdeaInspector } from '@/components/ideas/idea-inspector';
import '@/components/ideas/ideas-canvas.css';

export default function IdeaCanvasPage() {
  const params = useParams();
  const canvasId = (params?.id as string) || '';

  const [canvas, setCanvas] = useState<IdeaCanvas | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [isSaved, setIsSaved] = useState(true);
  const [showPalette, setShowPalette] = useState(true);
  const [showInspector, setShowInspector] = useState(true);

  // Load canvas on mount
  useEffect(() => {
    if (!canvasId) return;
    const found = loadCanvasById(canvasId);
    if (found) {
      setCanvas(found);
    } else {
      // Fallback create starter
      const fallback = createStarterCanvas();
      fallback.id = canvasId;
      saveCanvas(fallback);
      setCanvas(fallback);
    }
  }, [canvasId]);

  // Persist helper
  const handleSaveCanvas = useCallback((updatedCanvas: IdeaCanvas) => {
    setCanvas(updatedCanvas);
    setIsSaved(false);
    saveCanvas(updatedCanvas);
    setTimeout(() => setIsSaved(true), 300);
  }, []);

  // Update canvas metadata
  const handleUpdateCanvasMeta = (updates: Partial<IdeaCanvas>) => {
    if (!canvas) return;
    handleSaveCanvas({ ...canvas, ...updates });
  };

  // Node count summary for palette & inspector
  const nodeCounts = useMemo(() => {
    if (!canvas) return { hero: 0, failure: 0, mitigation: 0, pillar: 0, gate: 0 };
    return canvas.nodes.reduce(
      (acc, node) => {
        acc[node.type] = (acc[node.type] || 0) + 1;
        return acc;
      },
      { hero: 0, failure: 0, mitigation: 0, pillar: 0, gate: 0 } as Record<IdeaNodeType, number>
    );
  }, [canvas]);

  // Algorithmic Auto-Layout trigger
  const handleAutoLayout = useCallback(() => {
    if (!canvas) return;
    const organizedNodes = autoLayoutNodes(canvas.nodes);
    handleSaveCanvas({ ...canvas, nodes: organizedNodes });
  }, [canvas, handleSaveCanvas]);

  // Add new node positioned neatly in its designated swimlane column or custom pos
  const handleAddNode = (type: IdeaNodeType, customPos?: { x: number; y: number }) => {
    if (!canvas) return;

    const defaults: Record<IdeaNodeType, { title: string; color: string }> = {
      hero: { title: 'Ide utama baru', color: '#8B8D98' },
      failure: { title: 'Bagaimana ide ini gagal?', color: '#E5484D' },
      mitigation: { title: 'Cara mencegahnya', color: '#30A46C' },
      pillar: { title: 'Yang harus benar', color: '#8E4EC6' },
      gate: { title: 'Tes yang harus lolos', color: '#E9A23B' },
    };
    const { title, color } = defaults[type];
    const categoryLabel = undefined;
    const statusLabel = type === 'gate' ? 'Belum diuji' : undefined;

    const col = CANVAS_COLUMNS[type] || CANVAS_COLUMNS.hero;
    const sameTypeNodes = canvas.nodes.filter((n) => n.type === type);
    const nextY =
      sameTypeNodes.length > 0
        ? Math.max(...sameTypeNodes.map((n) => n.y)) + 240
        : type === 'hero'
        ? 320
        : type === 'failure'
        ? 140
        : 120;

    const newNode: IdeaNode = {
      id: `node-${Date.now()}`,
      type,
      title,
      categoryLabel,
      color,
      width: col.width,
      statusLabel,
      status: type === 'gate' ? 'pending' : undefined,
      x: customPos ? Math.round(customPos.x) : col.x,
      y: customPos ? Math.round(customPos.y) : nextY,
    };

    const updatedNodes = [...canvas.nodes, newNode];
    handleSaveCanvas({ ...canvas, nodes: updatedNodes });
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
    setShowInspector(true);
  };

  // Update selected node
  const handleUpdateNode = (updates: Partial<IdeaNode>) => {
    if (!canvas || !selectedNodeId) return;
    const updatedNodes = canvas.nodes.map((n) =>
      n.id === selectedNodeId ? { ...n, ...updates } : n
    );
    handleSaveCanvas({ ...canvas, nodes: updatedNodes });
  };

  // Delete node
  const handleDeleteNode = (id: string) => {
    if (!canvas) return;
    const updatedNodes = canvas.nodes.filter((n) => n.id !== id);
    const updatedEdges = canvas.edges.filter(
      (e) => e.fromNodeId !== id && e.toNodeId !== id
    );
    handleSaveCanvas({ ...canvas, nodes: updatedNodes, edges: updatedEdges });
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // Duplicate node
  const handleDuplicateNode = (node: IdeaNode) => {
    if (!canvas) return;
    const clone: IdeaNode = {
      ...node,
      id: `node-${Date.now()}`,
      title: `${node.title} (Salinan)`,
      x: node.x + 20,
      y: node.y + 20,
    };
    handleSaveCanvas({ ...canvas, nodes: [...canvas.nodes, clone] });
    setSelectedNodeId(clone.id);
  };

  // Update selected edge
  const handleUpdateEdge = (updates: Partial<IdeaEdge>) => {
    if (!canvas || !selectedEdgeId) return;
    const updatedEdges = canvas.edges.map((e) =>
      e.id === selectedEdgeId ? { ...e, ...updates } : e
    );
    handleSaveCanvas({ ...canvas, edges: updatedEdges });
  };

  // Delete edge
  const handleDeleteEdge = (id: string) => {
    if (!canvas) return;
    const updatedEdges = canvas.edges.filter((e) => e.id !== id);
    handleSaveCanvas({ ...canvas, edges: updatedEdges });
    if (selectedEdgeId === id) setSelectedEdgeId(null);
  };

  // Create edge manually
  const handleCreateEdge = (fromId: string, toId: string) => {
    if (!canvas) return;
    const exists = canvas.edges.some(
      (e) =>
        (e.fromNodeId === fromId && e.toNodeId === toId) ||
        (e.fromNodeId === toId && e.toNodeId === fromId)
    );
    if (exists) return;

    const sourceNode = canvas.nodes.find((n) => n.id === fromId);
    const newEdge: IdeaEdge = {
      id: `edge-${Date.now()}`,
      fromNodeId: fromId,
      toNodeId: toId,
      color: sourceNode?.color || 'var(--accent)',
      style: 'solid',
      hasArrow: true,
    };
    handleSaveCanvas({ ...canvas, edges: [...canvas.edges, newEdge] });
    setSelectedEdgeId(newEdge.id);
  };

  // Export JSON
  const handleExport = () => {
    if (!canvas) return;
    const blob = new Blob([JSON.stringify(canvas, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${canvas.title.toLowerCase().replace(/\s+/g, '-')}-canvas.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.nodes && parsed.edges) {
          parsed.id = canvasId;
          parsed.updatedAt = new Date().toISOString();
          handleSaveCanvas(parsed);
        }
      } catch {
        alert('Format file JSON tidak valid.');
      }
    };
    reader.readAsText(file);
  };

  if (!canvas) {
    return (
      <div className="ic-loading">
        Memuat kanvas...
      </div>
    );
  }

  const selectedNode = canvas.nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedEdge = canvas.edges.find((e) => e.id === selectedEdgeId) || null;

  return (
    <div className="ic-root">
      {/* Topbar with back navigation, controls & ChromeControls */}
      <IdeaTopbar
        canvas={canvas}
        onUpdateCanvas={handleUpdateCanvasMeta}
        onExport={handleExport}
        onImport={handleImport}
        isSaved={isSaved}
        showPalette={showPalette}
        onTogglePalette={() => setShowPalette((prev) => !prev)}
        showInspector={showInspector}
        onToggleInspector={() => setShowInspector((prev) => !prev)}
      />

      {/* Main Workspace: Left Palette + Canvas + Right Inspector */}
      <div className="ic-workspace">
        {showPalette && (
          <IdeaPalette
            onAddNode={handleAddNode}
            nodeCounts={nodeCounts}
            onAutoLayout={handleAutoLayout}
            onClose={() => setShowPalette(false)}
          />
        )}

        <IdeaCanvasBoard
          nodes={canvas.nodes}
          edges={canvas.edges}
          onUpdateNodes={(nodes) => handleSaveCanvas({ ...canvas, nodes })}
          onUpdateEdges={(edges) => handleSaveCanvas({ ...canvas, edges })}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          onSelectNode={(id) => {
            setSelectedNodeId(id);
            if (id) {
              setSelectedEdgeId(null);
              setShowInspector(true);
            }
          }}
          onSelectEdge={(id) => {
            setSelectedEdgeId(id);
            if (id) {
              setSelectedNodeId(null);
              setShowInspector(true);
            }
          }}
          zoom={zoom}
          onZoomChange={setZoom}
          onAddNode={handleAddNode}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />

        {showInspector && (
          <IdeaInspector
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
            onUpdateEdge={handleUpdateEdge}
            onDeleteEdge={handleDeleteEdge}
            onClose={() => {
              if (selectedNodeId || selectedEdgeId) {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              } else {
                setShowInspector(false);
              }
            }}
            nodes={canvas.nodes}
            edges={canvas.edges}
            onAutoLayout={handleAutoLayout}
            onAddNode={handleAddNode}
            onCreateEdge={handleCreateEdge}
          />
        )}
      </div>
    </div>
  );
}
