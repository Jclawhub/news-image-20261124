// news-image-20261124 — draws one 1024x1024 PNG that sums up the world's
// news of Tuesday 24 November 2026 and writes it to /output/entry.png.
// Node 22+, standard library only (node:fs, node:zlib, node:path). No network,
// no clock, no randomness: every run writes byte-identical output.

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// A tiny 5x7 pixel font. Every glyph is seven rows of five cells; '#' is ink.
// Only capitals, digits and the punctuation the copy needs, so the table
// stays small. All image copy is set in capitals.
// ---------------------------------------------------------------------------
type Glyph = string[];
const FONT: Record<string, Glyph> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  '(': ['...##', '..#..', '.#...', '.#...', '.#...', '..#..', '...##'],
  ')': ['##...', '..#..', '...#.', '...#.', '...#.', '..#..', '##...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '&': ['.##..', '#..#.', '#..#.', '.#...', '#.#.#', '#..#.', '.##.#'],
};

// ---------------------------------------------------------------------------
// Canvas: an RGB pixel buffer with the drawing tools the page needs.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const PAPER: RGB = [252, 249, 240];
const CREAM: RGB = [238, 232, 214];
const INK: RGB = [22, 26, 38];
const TEAL: RGB = [13, 74, 74];
const TEAL2: RGB = [18, 110, 104];
const GOLD: RGB = [196, 141, 26];
const RUST: RGB = [178, 44, 28];
const NAVY: RGB = [28, 48, 88];
const SLATE: RGB = [74, 96, 128];
const LEAF: RGB = [42, 122, 64];
const PLUM: RGB = [122, 58, 132];
const AMBER: RGB = [186, 104, 8];
const GREY: RGB = [118, 122, 128];
const LINE: RGB = [214, 207, 190];

class Canvas {
  readonly w: number;
  readonly h: number;
  private data: Uint8Array;
  constructor(w: number, h: number, bg: RGB) {
    this.w = w;
    this.h = h;
    this.data = new Uint8Array(w * h * 3);
    this.fill(bg);
  }
  fill(c: RGB): void {
    for (let i = 0; i < this.w * this.h; i++) {
      this.data[i * 3] = c[0];
      this.data[i * 3 + 1] = c[1];
      this.data[i * 3 + 2] = c[2];
    }
  }
  set(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
  }
  box(x: number, y: number, w: number, h: number, c: RGB): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  frame(x: number, y: number, w: number, h: number, c: RGB, t = 2): void {
    this.box(x, y, w, t, c);
    this.box(x, y + h - t, w, t, c);
    this.box(x, y, t, h, c);
    this.box(x + w - t, y, t, h, c);
  }
  // Bresenham segment, thickness t.
  seg(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    let x = x0;
    let y = y0;
    for (;;) {
      for (let a = 0; a < t; a++) for (let b = 0; b < t; b++) this.set(x + a, y + b, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
  dot(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) this.set(x, y, c);
      }
    }
  }
  ring(cx: number, cy: number, r: number, c: RGB, t = 2): void {
    for (let a = 0; a < 360; a++) {
      const rad = (a * Math.PI) / 180;
      const x = Math.round(cx + r * Math.cos(rad));
      const y = Math.round(cy + r * Math.sin(rad));
      for (let i = 0; i < t; i++) for (let j = 0; j < t; j++) this.set(x + i, y + j, c);
    }
  }
  // Text: one cell is 5*scale wide plus 1*scale gap; 7*scale tall.
  textW(s: string, scale: number): number {
    return s.length * 6 * scale - scale;
  }
  text(x: number, y: number, s: string, scale: number, c: RGB): void {
    let cx = x;
    for (const ch of s) {
      const g = FONT[ch] ?? FONT[' '];
      for (let r = 0; r < 7; r++) {
        for (let col = 0; col < 5; col++) {
          if (g[r][col] === '#') this.box(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
      cx += 6 * scale;
    }
  }
  textC(x: number, y: number, w: number, s: string, scale: number, c: RGB): void {
    this.text(x + Math.floor((w - this.textW(s, scale)) / 2), y, s, scale, c);
  }
  wrap(s: string, scale: number, maxW: number): string[] {
    const out: string[] = [];
    let cur = '';
    for (const word of s.split(' ')) {
      const test = cur === '' ? word : cur + ' ' + word;
      if (this.textW(test, scale) <= maxW) cur = test;
      else {
        if (cur !== '') out.push(cur);
        cur = word;
      }
    }
    if (cur !== '') out.push(cur);
    return out;
  }
  raw(): Uint8Array {
    return this.data;
  }
}

// ---------------------------------------------------------------------------
// PNG writer: RGB8, no filtering, zlib deflate, CRC32 chunks.
// ---------------------------------------------------------------------------
const CRC: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(d: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < d.length; i++) c = CRC[(c ^ d[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function toPNG(cv: Canvas): Buffer {
  const W = cv.w;
  const H = cv.h;
  const px = cv.raw();
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// Small geometric pictograms, drawn in a square of side s at (x, y).
// ---------------------------------------------------------------------------
type Icon = (cv: Canvas, x: number, y: number, s: number, c: RGB) => void;

const iconSatellite: Icon = (cv, x, y, s, c) => {
  const cx = x + s / 2;
  const cy = y + s / 2;
  // Solar panels: two wide rectangles flanking the body.
  cv.box(cx - 62, cy - 14, 34, 28, GOLD);
  cv.box(cx + 28, cy - 14, 34, 28, GOLD);
  cv.box(cx - 62, cy - 14, 34, 4, c);
  cv.box(cx + 28, cy - 14, 34, 4, c);
  // Body: a compact bus with a dish on top.
  cv.box(cx - 28, cy - 12, 56, 24, c);
  cv.box(cx - 10, cy - 26, 20, 14, c);
  cv.dot(cx, cy, 5, PAPER);
  // Antenna and signal arcs.
  cv.seg(cx, cy - 26, cx, cy - 40, c, 3);
  cv.dot(cx, cy - 42, 3, c);
  cv.ring(cx, cy - 42, 10, c, 2);
};

const iconGavel: Icon = (cv, x, y, s, c) => {
  const cx = x + s / 2;
  cv.box(cx - 30, y + 14, 60, 14, c); // gavel head
  cv.box(cx - 4, y + 28, 8, 40, c); // handle
  cv.box(cx - 26, y + s - 22, 52, 8, GOLD); // base
  cv.box(cx - 20, y + s - 30, 40, 8, c);
  cv.seg(cx - 30, y + 14, cx - 40, y + 4, c, 3);
  cv.seg(cx + 30, y + 14, cx + 40, y + 4, c, 3);
};

const iconTrophy: Icon = (cv, x, y, s, c) => {
  const cx = x + s / 2;
  cv.box(cx - 20, y + 10, 40, 34, c); // cup
  cv.box(cx - 8, y + 44, 16, 12, c); // stem
  cv.box(cx - 20, y + 56, 40, 8, GOLD); // base
  cv.seg(cx - 20, y + 16, cx - 34, y + 26, c, 3); // left handle
  cv.seg(cx + 20, y + 16, cx + 34, y + 26, c, 3); // right handle
  cv.dot(cx, y + 26, 6, GOLD);
};

const iconChartDown: Icon = (cv, x, y, s, c) => {
  const cx = x + s / 2;
  const cy = y + s / 2;
  cv.seg(x + 8, cy - 24, x + 26, cy - 6, c, 4);
  cv.seg(x + 26, cy - 6, x + 44, cy - 18, c, 4);
  cv.seg(x + 44, cy - 18, x + s - 10, cy + 20, c, 4);
  cv.seg(x + s - 10, cy + 20, x + s - 10, cy + 2, c, 4); // arrow head
  cv.seg(x + s - 10, cy + 20, x + s - 28, cy + 20, c, 4);
  cv.box(x + 8, cy + 28, s - 16, 3, SLATE); // axis
  void cx;
};

const iconLens: Icon = (cv, x, y, s, c) => {
  const cx = x + s / 2 - 8;
  const cy = y + s / 2 - 8;
  cv.ring(cx, cy, 24, c, 4);
  cv.seg(cx + 17, cy + 17, cx + 34, cy + 34, c, 4);
  cv.dot(cx - 6, cy - 6, 4, GOLD);
};

const iconScales: Icon = (cv, x, y, s, c) => {
  const cx = x + s / 2;
  cv.seg(cx, y + 8, cx, y + s - 20, c, 4); // post
  cv.seg(cx - 30, y + 16, cx + 30, y + 16, c, 4); // beam
  cv.seg(cx - 30, y + 16, cx - 30, y + 34, c, 3); // left string
  cv.seg(cx + 30, y + 16, cx + 30, y + 34, c, 3); // right string
  cv.box(cx - 42, y + 34, 24, 6, c); // left pan
  cv.box(cx + 18, y + 34, 24, 6, c); // right pan
  cv.box(cx - 24, y + s - 20, 48, 8, GOLD); // base
};

const iconTanker: Icon = (cv, x, y, s, c) => {
  const cx = x + s / 2;
  const cy = y + s / 2;
  cv.box(cx - 40, cy - 6, 80, 22, c); // hull
  cv.box(cx - 40, cy + 16, 80, 6, GOLD); // waterline
  cv.box(cx - 6, cy - 26, 26, 20, c); // bridge
  cv.box(cx + 24, cy - 18, 8, 12, c); // funnel
  cv.seg(cx - 52, cy + 30, cx - 30, cy + 30, SLATE, 3); // waves
  cv.seg(cx - 10, cy + 36, cx + 14, cy + 36, SLATE, 3);
  cv.seg(cx + 26, cy + 30, cx + 52, cy + 30, SLATE, 3);
};

// ---------------------------------------------------------------------------
// The day's stories. One lead, six in the grid. Copy is short, specific and
// checked against the day's reporting: every number and name below is real.
// ---------------------------------------------------------------------------
interface Story {
  kicker: string;
  headline: string;
  body: string;
  color: RGB;
  icon: Icon;
}

const STORIES: Story[] = [
  {
    kicker: 'SPACE / SECURITY',
    headline: 'NATO VOWS SPACE DEFENCE',
    body: 'RUSSIA MAY LAUNCH A NUCLEAR-ARMED SATELLITE IN 60 DAYS.',
    color: TEAL,
    icon: iconSatellite,
  },
  {
    kicker: 'FRANCE',
    headline: 'SARKOZY AND BRUNI TO STAND TRIAL',
    body: 'EX-PRESIDENT AND WIFE FACE TRIAL IN 2027.',
    color: RUST,
    icon: iconGavel,
  },
  {
    kicker: 'FOOTBALL',
    headline: 'SENEGAL GET AFCON TITLE BACK',
    body: 'CAS REINSTATES SENEGAL AS 2025 CHAMPIONS, OVERTURNING MOROCCO AWARD.',
    color: LEAF,
    icon: iconTrophy,
  },
  {
    kicker: 'MARKETS',
    headline: 'NVIDIA SHARES SLIDE 8%',
    body: 'LAWMAKERS QUESTION TRUMP ROLE IN BRINGING HUANG BACK.',
    color: NAVY,
    icon: iconChartDown,
  },
  {
    kicker: 'CHINA',
    headline: 'SHANGHAI PARTY CHIEF PROBED',
    body: 'CHEN JINING INVESTIGATED IN CORRUPTION PROBE.',
    color: PLUM,
    icon: iconLens,
  },
  {
    kicker: 'TECH / LAW',
    headline: 'HUAWEI GUILTY ON 10 COUNTS',
    body: 'BROOKLYN JURY CONVICTS ON BANK FRAUD AND IRAN SANCTIONS CHARGES.',
    color: SLATE,
    icon: iconScales,
  },
  {
    kicker: 'MIDDLE EAST',
    headline: 'HORMUZ TANKERS HIT',
    body: 'US WARNS OF HOUTHI THREAT AFTER RIYADH TOWER STRIKE.',
    color: AMBER,
    icon: iconTanker,
  },
];

// ---------------------------------------------------------------------------
// Page layout.
// ---------------------------------------------------------------------------
const W = 1024;
const H = 1024;
const M = 24;
const CW = W - 2 * M;

const cv = new Canvas(W, H, CREAM);

function panel(x: number, y: number, w: number, h: number, st: Story, lead: boolean): void {
  cv.box(x, y, w, h, PAPER);
  cv.frame(x, y, w, h, LINE, 2);
  const bandH = lead ? 38 : 32;
  cv.box(x, y, w, bandH, st.color);
  cv.text(x + 14, y + Math.floor((bandH - 14) / 2), st.kicker, 2, PAPER);
  const iconS = lead ? 140 : 88;
  const ix = x + w - iconS - 16;
  const iy = y + bandH + Math.floor((h - bandH - iconS) / 2);
  st.icon(cv, ix, iy, iconS, st.color);
  const tx = x + 14;
  const tw = w - iconS - 16 - 14 - 14;
  const hs = lead ? 4 : 2;
  const heads = cv.wrap(st.headline, hs, tw).slice(0, 2);
  const bodys = cv.wrap(st.body, 2, tw).slice(0, 3);
  const textH = heads.length * (7 * hs + 4) + 4 + bodys.length * (7 * 2 + 3);
  let ty = lead
    ? y + bandH + Math.floor((h - bandH - textH) / 2)
    : y + bandH + 12;
  for (const ln of heads) {
    cv.text(tx, ty, ln, hs, INK);
    ty += 7 * hs + 4;
  }
  ty += 4;
  for (const ln of bodys) {
    cv.text(tx, ty, ln, 2, INK);
    ty += 7 * 2 + 3;
  }
}

// Masthead.
cv.box(0, 0, W, 128, TEAL);
cv.box(0, 128, W, 4, GOLD);
cv.textC(0, 16, W, 'THE WORLD IN ONE PAGE', 5, PAPER);
cv.textC(0, 62, W, 'TUESDAY 24 NOVEMBER 2026', 4, GOLD);
cv.textC(0, 98, W, 'SEVEN STORIES THAT SHAPED THE DAY', 2, PAPER);

// Lead story, full width.
panel(M, 148, CW, 188, STORIES[0], true);

// Grid: stories 2-7, two columns by three rows.
const gridTop = 352;
const gap = 16;
const pw = Math.floor((CW - gap) / 2);
const ph = 188;
for (let i = 1; i < STORIES.length; i++) {
  const idx = i - 1;
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  panel(M + col * (pw + gap), gridTop + row * (ph + gap), pw, ph, STORIES[i], false);
}

// Footer.
const footY = gridTop + 3 * ph + 2 * gap + 14;
cv.textC(0, footY, W, 'ALL STORIES FROM NEWS REPORTS  -  24 NOVEMBER 2026', 2, GREY);

// ---------------------------------------------------------------------------
// Write the file. MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.
// ---------------------------------------------------------------------------
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'entry.png'), toPNG(cv));
