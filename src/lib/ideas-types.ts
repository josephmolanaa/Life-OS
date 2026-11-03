export type IdeaNodeType = 'hero' | 'failure' | 'mitigation' | 'pillar' | 'gate';

export interface IdeaPort {
  id: string;
  name: string;
  side: 'left' | 'right';
  offsetY: number; // relative Y offset in px or %
}

export interface IdeaNode {
  id: string;
  type: IdeaNodeType;
  title: string;
  subtitle?: string;
  description?: string;
  statusLabel?: string;
  categoryLabel?: string;
  status?: 'completed' | 'in_progress' | 'pending';
  x: number;
  y: number;
  width: number;
  height?: number;
  color: string; // hex color for accent
  badgeText?: string;
  readinessScore?: number;
}

export interface IdeaEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromPortIndex?: number;
  toPortIndex?: number;
  color?: string;
  style?: 'solid' | 'dashed';
  hasArrow?: boolean;
}

export interface IdeaCanvas {
  id: string;
  title: string;
  subtitle: string;
  step: 1 | 2 | 3;
  nodes: IdeaNode[];
  edges: IdeaEdge[];
  updatedAt: string;
  createdAt: string;
}
