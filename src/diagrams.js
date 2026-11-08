// "What to measure" diagrams, one per calculator. build.js inlines them as SVG (viewBox 0 0 320 200).
// Colors come from CSS classes in style.css: "f m-<material>" for filled shapes, "dim" for dimension lines.
const r = n => Math.round(n * 10) / 10;
const pts = a => a.map(p => p.map(r).join(',')).join(' ');
const poly = (c, a) => `<polygon class="f m-${c}" points="${pts(a)}"/>`;
const rect = (c, x, y, w, h) => `<rect class="f m-${c}" x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}"/>`;
const line = (c, x1, y1, x2, y2) => `<line${c ? ` class="${c}"` : ''} x1="${r(x1)}" y1="${r(y1)}" x2="${r(x2)}" y2="${r(y2)}"/>`;
const label = (x, y, t, rot) => `<text class="lbl" x="${x}" y="${y}" text-anchor="middle"${rot ? ` transform="rotate(${rot} ${x} ${y})"` : ''}>${t}</text>`;
const dot = (x, y, rad) => `<circle class="dot" cx="${r(x)}" cy="${r(y)}" r="${rad}"/>`;

// Dimension line with end ticks; label at (lx, ly), rotated -90 for vertical dims.
function dim(x1, y1, x2, y2, t, lx, ly, rot) {
  const k = 5 / Math.hypot(x2 - x1, y2 - y1), nx = (y1 - y2) * k, ny = (x2 - x1) * k;
  const tick = (x, y) => line('', x - nx, y - ny, x + nx, y + ny);
  return `<g class="dim">${line('', x1, y1, x2, y2)}${tick(x1, y1)}${tick(x2, y2)}${label(lx, ly, t, rot)}</g>`;
}
// Length below and width to the right of a flat (top-view) rectangle.
const planDims = (x, y, w, h, a = 'Length', b = 'Width') =>
  dim(x, y + h + 16, x + w, y + h + 16, a, x + w / 2, y + h + 33) + dim(x + w + 16, y, x + w + 16, y + h, b, x + w + 34, y + h / 2, -90);

// Oblique box: front face w×h with top-left at (x, y), receding by (dx, -dy).
function box(c, x, y, w, h, dx, dy) {
  const top = [[x, y], [x + dx, y - dy], [x + w + dx, y - dy], [x + w, y]];
  const side = [[x + w, y], [x + w + dx, y - dy], [x + w + dx, y + h - dy], [x + w, y + h]];
  return rect(c, x, y, w, h) + poly(c, top) + `<polygon class="hi" points="${pts(top)}"/>` + poly(c, side) + `<polygon class="shade" points="${pts(side)}"/>`;
}
// Calls mark(x, y, i) at points spread over a box's top face (texture for gravel, soil, mulch).
function onTop(x, y, w, dx, dy, mark) {
  let s = '';
  for (let j = 1; j < 4; j++) for (let i = 0; i < 10; i++) {
    const u = (i + (j % 2 ? 0.7 : 0.2)) / 10.5, v = j / 4;
    s += mark(x + u * w + v * dx, y - v * dy, i + j);
  }
  return s;
}
// Rows of units (bricks, pavers, planks, tiles). Each row shifts by `stagger` of a unit.
function bond(c, x, y, w, h, bw, bh, stagger = 0.5) {
  let s = '';
  for (let row = 0; row * bh < h - 0.01; row++) {
    for (let bx = -((row * stagger) % 1) * bw; bx < w - 0.01; bx += bw) {
      const a = Math.max(bx, 0), b = Math.min(bx + bw, w);
      s += rect(c, x + a, y + row * bh, b - a, Math.min(bh, h - row * bh));
    }
  }
  return s;
}

const bed = (c, mark) => box(c, 80, 100, 170, 22, 45, 40) + onTop(80, 100, 170, 45, 40, mark)
  + dim(80, 140, 250, 140, 'Length', 165, 158) + dim(262, 127, 307, 87, 'Width', 296, 127) + dim(66, 100, 66, 122, 'Depth', 56, 111, -90);
const wall = (c, bw, bh) => bond(c, 40, 40, 240, 120, bw, bh) + dim(40, 176, 280, 176, 'Length', 160, 193) + dim(296, 40, 296, 160, 'Height', 314, 100, -90);

function fence() {
  let s = line('ground', 10, 165, 310, 165);
  for (let x = 40; x < 296; x += 11) s += rect('wood', x, 58, 8, 105);
  s += rect('wood2', 30, 72, 270, 8) + rect('wood2', 30, 138, 270, 8);
  for (let x = 30; x <= 290; x += 65) s += rect('post', x, 45, 10, 122);
  return s + dim(35, 32, 100, 32, 'Post spacing', 67, 24) + dim(30, 180, 300, 180, 'Fence length', 165, 196);
}

function roof() {
  const at = y => (y - 40) * 100 / 72; // half-width of the roof at height y
  let s = line('ground', 10, 170, 310, 170) + rect('wall', 85, 110, 150, 60) + poly('roof', [[60, 112], [160, 40], [260, 112]]);
  for (let y = 54; y < 110; y += 14) s += line('shingle', 160 - at(y), y, 160 + at(y), y);
  s += rect('door', 145, 130, 30, 40);
  return s + `<g class="dim">${line('', 190, 61.6, 240, 61.6)}${line('', 240, 61.6, 240, 97.6)}${label(215, 55, '12')}${label(256, 84, 'Rise')}</g>`
    + dim(60, 182, 260, 182, 'Footprint width', 160, 198);
}

function deck() {
  let s = '';
  for (let y = 25; y < 150; y += 14) s += rect('wood', 40, y, 230, 11);
  for (let x = 60; x < 270; x += 40) s += line('hidden', x, 25, x, 150);
  return s + dim(40, 166, 270, 166, 'Length (board direction)', 155, 184) + dim(286, 25, 286, 150, 'Width', 304, 88, -90)
    + dim(60, 17, 100, 17, 'Joist spacing', 80, 11);
}

function drywall() {
  let s = '';
  for (let x = 50; x < 260; x += 70) {
    s += rect('board', x, 25, 70, 140);
    for (let sx = x + 6; sx < x + 70; sx += 29) for (let sy = 35; sy < 165; sy += 20) s += dot(sx, sy, 1.3);
  }
  return s + label(155, 100, '4 × 8 sheet') + dim(276, 25, 276, 165, 'Wall height', 294, 95, -90) + dim(50, 181, 260, 181, 'Wall length', 155, 197);
}

function stairs() {
  const steps = [[40, 170]];
  for (let n = 0; n < 5; n++) { const [x, y] = steps[steps.length - 1]; steps.push([x, y - 24], [n < 4 ? x + 36 : x, y - 24]); }
  steps.push([184, 170]);
  return line('ground', 10, 170, 310, 170) + poly('wood', steps) + rect('slab', 184, 50, 126, 14) + line('hidden', 40, 170, 184, 50)
    + label(122, 118, 'Stringer', -40)
    + dim(296, 50, 296, 170, 'Total rise', 288, 112, -90) + dim(28, 146, 28, 170, 'Riser', 22, 158, -90) + dim(148, 66, 184, 66, 'Tread', 166, 59);
}

function baseboard() {
  return rect('floor', 60, 35, 200, 120) + '<path class="trim" d="M120 155H60V35H260V155H165"/>'
    + line('ln', 165, 155, 165, 112) + '<path class="hidden" d="M165 112A43 43 0 0 0 122 155"/>'
    + label(142, 172, 'Doorway') + label(48, 95, 'Baseboard', -90)
    + dim(60, 20, 260, 20, 'Room length', 160, 13) + dim(276, 35, 276, 155, 'Room width', 294, 95, -90);
}

function room() {
  return poly('ceil', [[20, 10], [300, 10], [230, 40], [90, 40]])
    + poly('wall', [[20, 10], [90, 40], [90, 150], [20, 180]]) + '<polygon class="shade" points="20,10 90,40 90,150 20,180"/>'
    + poly('wall', [[230, 40], [300, 10], [300, 180], [230, 150]]) + '<polygon class="shade" points="230,40 300,10 300,180 230,150"/>'
    + rect('wall', 90, 40, 140, 110) + poly('floor', [[20, 180], [90, 150], [230, 150], [300, 180]])
    + rect('door', 106, 80, 34, 70) + rect('glass', 156, 62, 44, 34)
    + dim(218, 40, 218, 150, 'Height', 212, 112, -90) + dim(90, 162, 230, 162, 'Width', 160, 177);
}

function picked(c, x, y, w, h, bw, bh, stagger, px, py) {
  return bond(c, x, y, w, h, bw, bh, stagger) + `<rect class="pick" x="${px}" y="${py}" width="${bw}" height="${bh}"/>` + planDims(x, y, w, h);
}

const DIAGRAMS = {
  'concrete-calculator': () => box('concrete', 80, 95, 170, 30, 45, 40)
    + dim(80, 142, 250, 142, 'Length', 165, 160) + dim(262, 130, 307, 90, 'Width', 296, 130) + dim(66, 95, 66, 125, 'Thickness', 56, 110, -90),
  'concrete-column-calculator': () => rect('soil', 20, 60, 280, 125) + rect('concrete', 115, 60, 90, 110) + rect('wood', 145, 15, 30, 140)
    + label(197, 34, 'Post') + label(262, 52, 'Ground') + dim(115, 178, 205, 178, 'Diameter', 160, 195) + dim(222, 60, 222, 170, 'Depth', 240, 115, -90),
  'concrete-block-calculator': () => wall('block', 48, 24),
  'brick-calculator': () => wall('brick', 30, 12),
  'gravel-calculator': () => bed('gravel', (x, y) => dot(x, y, 3)),
  'topsoil-calculator': () => bed('soil', (x, y) => dot(x, y, 1.6)),
  'mulch-calculator': () => bed('mulch', (x, y, i) => line('chip', x - 4, y + (i % 2 ? 2 : -2), x + 4, y - (i % 2 ? 2 : -2))),
  'paver-calculator': () => picked('paver', 50, 25, 200, 125, 30, 15, 0.5, 125, 40),
  'sod-calculator': () => bond('grass', 50, 25, 200, 125, 50, 25) + planDims(50, 25, 200, 125, 'Lawn length', 'Lawn width'),
  'fence-calculator': fence,
  'paint-calculator': room,
  'tile-calculator': () => picked('tile', 50, 25, 200, 125, 25, 25, 0, 125, 50),
  'flooring-calculator': () => bond('wood', 50, 25, 200, 125, 75, 12.5, 0.33) + planDims(50, 25, 200, 125, 'Room length', 'Room width'),
  'drywall-calculator': drywall,
  'baseboard-calculator': baseboard,
  'deck-calculator': deck,
  'roofing-calculator': roof,
  'stair-calculator': stairs,
  'board-foot-calculator': () => {
    let s = box('wood', 50, 110, 210, 26, 40, 34);
    for (const v of [0.3, 0.65]) s += line('grain', 50 + v * 40, 110 - v * 34, 260 + v * 40, 110 - v * 34);
    return s + dim(50, 152, 260, 152, 'Length', 155, 170) + dim(36, 110, 36, 136, 'Thickness', 30, 123, -90) + dim(272, 141, 312, 107, 'Width', 300, 142);
  },
  'square-footage-calculator': () => {
    let s = rect('floor', 50, 25, 200, 125);
    for (let x = 75; x < 250; x += 25) s += line('grid', x, 25, x, 150);
    for (let y = 50; y < 150; y += 25) s += line('grid', 50, y, 250, y);
    return s + `<text class="lbl big" x="150" y="96" text-anchor="middle">Area</text>` + planDims(50, 25, 200, 125);
  },
};

// Full <svg> for a calculator. Throws if one is missing so the build fails loudly.
function diagram(slug, alt) {
  if (!DIAGRAMS[slug]) throw new Error(`No diagram for ${slug} in src/diagrams.js`);
  const a11y = alt ? `role="img" aria-label="${alt}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="dg" viewBox="0 0 320 200" ${a11y}>${DIAGRAMS[slug]()}</svg>`;
}

module.exports = { diagram };
