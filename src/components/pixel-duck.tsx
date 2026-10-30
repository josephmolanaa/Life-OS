'use client';

import { useEffect, useRef } from 'react';

// 28x28 pixel rubber duck, 8-frame loops. Scale only by whole numbers (28, 56, 84px) to keep pixels crisp.
const PALETTE: Record<string, string> = { O: '#38162d', Y: '#ffd900', D: '#f5a618', S: '#e87818', W: '#fffbe6', R: '#f54228', B: '#b31b38', P: '#7d9ce8', L: '#c4dcf7' };
const BODY = [
  '.......OOOOOO.......', '.....OOYYYYWWOO.....', '....OYYYYYYYWWWO....', '...ODYYYYYYYYYYYO...',
  '...ODYYYYOOYYYYYO...', '...ODYYYYOOYYYOOOOO.', '...ODYYYYYYYYORRRRRO', '..OOODYYYYYYYOBBBBBO',
  '.OYYOODDDDDDDDOOOOO.', '.OYYYYYYYYYYYYYYYYO.', '.OYYOOOOOOYYYYWWWYO.', '.OYODWWWWWODYYWYYYO.',
  '.OYODYWWYYODYYYYYYO.', '.OYSDDYYYYODYYYYYYO.', '..OSSDYYYYYYYYYYYSO.', '..OOSSDDDDDDDDDDSSO.',
  '...OOSSSSSSSSSSSSO..',
];
const WATER = ['.PPPPPOOOOOOOOOOPPPP', '..LL.LLLLLLLLLLLL.L.'];
// Panic face: > < eyes and an open beak.
const PANIC = [
  '.......OOOOOO.......', '.....OOYYYYWWOO.....', '....OYYYYYYYWWWO....', '...ODYYYYYYYYYYYO...',
  '...ODYYYO.OYYYYYO...', '...ODYYYYO.YYYOOOOO.', '...ODYYYO.OYORRRRRO.', '..OOODYYYYYYOOOOOO..',
  '.OYYOODDDDDDOBBBBBO.', '.OYYYYYYYYYYYOOOOO..', '.OYYOOOOOOYYYYWWWYO.', '.OYODWWWWWODYYWYYYO.',
  '.OYODYWWYYODYYYYYYO.', '.OYSDDYYYYODYYYYYYO.', '..OSSDYYYYYYYYYYYSO.', '..OOSSDDDDDDDDDDSSO.',
  '...OOSSSSSSSSSSSSO..',
];

type Ctx = CanvasRenderingContext2D;
const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
function sprite(ctx: Ctx, rows: string[], x: number, y: number, overrides: Record<string, string> = {}) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => { const color = overrides[ch] || PALETTE[ch]; if (color) px(ctx, x + c, y + r, 1, 1, color); }));
}

const scenes = {
  // Floating with a blink.
  idle(ctx: Ctx, f: number) {
    const dy = 5 + (f % 4 < 2 ? 0 : 1);
    sprite(ctx, BODY, 4, dy);
    if (f === 3) { px(ctx, 13, dy + 4, 2, 1, '#ffd900'); px(ctx, 13, dy + 5, 2, 1, '#38162d'); }
    sprite(ctx, WATER, 3 + (f % 2), 22);
  },
  // Focus timer running: shades and a laptop.
  focus(ctx: Ctx, f: number) {
    const dx = 2, dy = 6 + (f % 2);
    sprite(ctx, BODY, dx, dy);
    px(ctx, dx + 4, dy + 4, 11, 1, '#0f172a'); px(ctx, dx + 8, dy + 5, 4, 2, '#0f172a'); px(ctx, dx + 13, dy + 5, 3, 2, '#0f172a');
    px(ctx, dx + 9, dy + 5, 1, 1, '#fff'); px(ctx, dx + 14, dy + 5, 1, 1, '#fff');
    const wingY = dy + 11 + (f % 2);
    px(ctx, dx + 13, wingY, 5, 3, '#ffd900'); px(ctx, dx + 13, wingY, 4, 1, '#38162d');
    px(ctx, 16, 22, 10, 2, '#38162d'); px(ctx, 17, 22, 8, 1, '#cbd5e1'); px(ctx, 19, 15, 8, 7, '#38162d'); px(ctx, 20, 16, 6, 5, '#064e3b');
    px(ctx, 21, 17 + (f % 3), 4, 1, '#4ade80'); px(ctx, 21, 16 + ((f + 1) % 4), 2, 1, '#86efac');
  },
  // Goal reached: hop, happy eyes, party hat, confetti.
  success(ctx: Ctx, f: number) {
    const dx = 4, dy = 7 + [0, -2, -4, -2, 0, -1, -3, -1][f % 8];
    sprite(ctx, BODY, dx, dy);
    px(ctx, dx + 9, dy + 4, 2, 2, '#ffd900'); px(ctx, dx + 8, dy + 4, 1, 1, '#38162d'); px(ctx, dx + 9, dy + 3, 1, 1, '#38162d'); px(ctx, dx + 10, dy + 4, 1, 1, '#38162d');
    px(ctx, dx + 8, dy - 2, 4, 2, '#a855f7'); px(ctx, dx + 9, dy - 4, 2, 2, '#38bdf8'); px(ctx, dx + 9, dy - 5, 2, 1, '#fde047');
    const sy = 2 + (f % 2);
    px(ctx, 20, sy + 3, 2, 2, '#22c55e'); px(ctx, 22, sy + 2, 2, 2, '#22c55e'); px(ctx, 24, sy + 1, 2, 2, '#4ade80');
    const c = f % 4;
    px(ctx, 3, 4 + c, 2, 2, '#f43f5e'); px(ctx, 23, 14 + c, 2, 2, '#fde047'); px(ctx, 4, 15 - c, 2, 2, '#38bdf8');
  },
  // Thinking: sweat drop, magnifying glass, bouncing "?".
  debug(ctx: Ctx, f: number) {
    const dx = 3, dy = 7;
    sprite(ctx, BODY, dx, dy);
    const sweatY = dy + 3 + (f % 3);
    px(ctx, dx + 4, sweatY, 2, 2, '#38bdf8'); px(ctx, dx + 4, sweatY, 1, 1, '#fff');
    const magY = 14 + (f % 2);
    px(ctx, 18, magY, 6, 6, '#38162d'); px(ctx, 19, magY + 1, 4, 4, '#38bdf8'); px(ctx, 20, magY + 2, 2, 2, '#e0f2fe'); px(ctx, 17, magY + 5, 2, 3, '#38162d');
    const qy = 1 + (f % 4 < 2 ? 0 : -1);
    px(ctx, 11, qy, 4, 1, '#38162d'); px(ctx, 11, qy + 1, 5, 2, '#fde047'); px(ctx, 14, qy + 2, 2, 2, '#fde047'); px(ctx, 12, qy + 3, 3, 1, '#fde047'); px(ctx, 12, qy + 5, 2, 1, '#fde047');
  },
  // Panic: shaking, flushed, red "!".
  error(ctx: Ctx, f: number) {
    const sx = f % 2 === 0 ? 3 : 5, sy = f % 3 === 0 ? 7 : 8;
    sprite(ctx, PANIC, sx, sy, f % 2 === 0 ? { Y: '#facc15', D: '#f97316', S: '#ef4444' } : {});
    px(ctx, sx, sy + 4, 3, 6, '#f97316'); px(ctx, sx + 16, sy + 4, 3, 6, '#f97316');
    if (f % 2 === 0) { px(ctx, 12, 0, 4, 5, '#38162d'); px(ctx, 13, 1, 2, 3, '#ef4444'); px(ctx, 13, 5, 2, 2, '#ef4444'); }
    else { px(ctx, 6, 2, 3, 2, '#94a3b8'); px(ctx, 19, 3, 2, 2, '#64748b'); }
  },
  // Coffee: steaming mug, sparkly eyes.
  coffee(ctx: Ctx, f: number) {
    const dx = 2, dy = 6 + (f % 2);
    sprite(ctx, BODY, dx, dy);
    px(ctx, dx + 9, dy + 4, 1, 1, '#fff');
    const mx = 18, my = 15;
    px(ctx, mx, my, 7, 8, '#38162d'); px(ctx, mx + 1, my + 1, 5, 6, '#fff'); px(ctx, mx + 1, my + 2, 5, 2, '#78350f'); px(ctx, mx + 6, my + 2, 2, 4, '#38162d'); px(ctx, mx + 6, my + 3, 1, 2, '#fff');
    const s = f % 4;
    px(ctx, mx + 2 + (s % 2), my - 2 - s, 1, 2, '#cbd5e1'); px(ctx, mx + 4 - (s % 2), my - 4 - ((s + 2) % 4), 1, 2, '#94a3b8');
  },
  // Lo-fi: headphones, nodding, floating notes, equalizer.
  music(ctx: Ctx, f: number) {
    const dx = f % 4 < 2 ? 3 : 4, dy = 6 + (f % 2);
    sprite(ctx, BODY, dx, dy);
    px(ctx, dx + 9, dy + 4, 2, 2, '#ffd900'); px(ctx, dx + 8, dy + 5, 3, 1, '#38162d');
    px(ctx, dx + 6, dy - 1, 7, 1, '#38162d'); px(ctx, dx + 7, dy, 5, 1, '#06b6d4'); px(ctx, dx + 5, dy, 2, 3, '#38162d');
    px(ctx, dx + 3, dy + 2, 5, 6, '#38162d'); px(ctx, dx + 4, dy + 3, 3, 4, '#ec4899'); px(ctx, dx + 5, dy + 4, 1, 2, '#22d3ee');
    px(ctx, dx + 4, dy + 11 + (f % 2 === 0 ? 0 : -1), 5, 2, '#fffbe6');
    const n1y = 5 - (f % 4), n1x = 1 + (f % 2);
    px(ctx, n1x, n1y + 3, 2, 2, '#22d3ee'); px(ctx, n1x + 1, n1y, 1, 4, '#22d3ee'); px(ctx, n1x + 2, n1y, 2, 1, '#22d3ee');
    const n2y = 5 - ((f + 2) % 4);
    px(ctx, 21, n2y + 3, 2, 2, '#f472b6'); px(ctx, 22, n2y, 1, 4, '#f472b6'); px(ctx, 22, n2y, 4, 1, '#fde047'); px(ctx, 24, n2y + 2, 2, 2, '#f472b6'); px(ctx, 25, n2y, 1, 3, '#f472b6');
    const eq1 = f % 2 === 0 ? 2 : 1, eq2 = f % 2 === 0 ? 1 : 3;
    px(ctx, 21, 23 - eq1, 1, eq1, '#22d3ee'); px(ctx, 23, 23 - eq2, 1, eq2, '#ec4899'); px(ctx, 25, 23 - eq1, 1, eq1, '#fde047');
  },
};
export type DuckScene = keyof typeof scenes;
export const duckScenes = Object.keys(scenes) as DuckScene[];

export function PixelDuck({ scene = 'idle', size = 28 }: { scene?: DuckScene; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const draw = () => { ctx.clearRect(0, 0, 28, 28); scenes[scene](ctx, frame); frame = (frame + 1) % 8; };
    draw();
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(draw, 140);
    return () => window.clearInterval(timer);
  }, [scene]);
  return <canvas ref={canvas} width={28} height={28} className="pixelDuck" style={{ width: size, height: size }} aria-hidden="true" />;
}
