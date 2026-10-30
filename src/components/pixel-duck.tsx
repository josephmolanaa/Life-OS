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

type Ctx = CanvasRenderingContext2D;
const px = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
function sprite(ctx: Ctx, rows: string[], x: number, y: number) {
  rows.forEach((row, r) => [...row].forEach((ch, c) => { if (PALETTE[ch]) px(ctx, x + c, y + r, 1, 1, PALETTE[ch]); }));
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
};
export type DuckScene = keyof typeof scenes;

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
