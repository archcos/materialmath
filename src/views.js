// Live 3D and plan (blueprint) drawings for the calculators, redrawn from the visitor's numbers.
// No library: a small renderer projects boxes and polygons to SVG and paints them back to front.
// Each view builder gets the same values as compute() (metres, fractions, menu values) and adds shapes to a scene.
(function (root) {
  const FT = 0.3048, IN = 0.0254;
  const COL = {
    concrete: '#c4c1ba', block: '#b8b5ae', brick: '#b4533c', gravel: '#a9a59c', soil: '#6e4c30', mulch: '#8b5a32', grass: '#5d9c3c',
    wood: '#cf9a5e', wood2: '#a8733f', post: '#8f5f33', paver: '#ad9f8e', tile: '#ece7dd', board: '#f1eee6', floor: '#e0c49c',
    wall: '#ece6dc', roof: '#4b5157', door: '#8b5a32', glass: '#a5cbe0', slab: '#9da1a5', sand: '#d8bf8a', mortar: '#d9d4c7',
    insul: '#efb4c2', siding: '#a9bfcf', fiber: '#c9bfae', stucco: '#e4dac8', metal: '#58748a', tileRoof: '#a2543a', steel: '#4f5961', paint: '#8fb8d8', trim: '#f97316',
  };

  // ---- Scene: faces for 3D, solids (extruded footprints) for the plan, plus plan-only marks.
  function Scene() { this.faces = []; this.solids = []; this.marks = []; this.dims = []; this.cut = Infinity; this.hasRoof = false; }
  const S = Scene.prototype;
  // A flat polygon. o: layer (drawn in layer order), two (visible from both sides), tag ('roof'), alpha, deco (line segments on it).
  S.face = function (pts, c, o = {}) {
    const f = { pts, c, layer: o.layer == null ? 1 : o.layer, two: !!o.two, tag: o.tag, alpha: o.alpha == null ? 1 : o.alpha, deco: o.deco, fl: this.mf };
    this.faces.push(f);
    if (o.tag === 'roof') this.hasRoof = true;
    return f;
  };
  // A solid: a footprint (counter-clockwise seen from above) extruded from z0 to z1. Its sides follow the footprint's edges.
  S.prism = function (foot, z0, z1, c, o = {}) {
    if (!(z1 - z0 > 1e-6) || foot.length < 3) return null;
    const fo = { ...o, plan: undefined };
    const top = this.face(foot.map(([x, y]) => [x, y, z1]), c, fo);
    const bottom = this.face(foot.slice().reverse().map(([x, y]) => [x, y, z0]), c, fo);
    const sides = foot.map((a, i) => { const b = foot[(i + 1) % foot.length]; return this.face([[a[0], a[1], z0], [b[0], b[1], z0], [b[0], b[1], z1], [a[0], a[1], z1]], c, fo); });
    const s = { foot, z0, z1, c, tag: o.tag, top, bottom, sides, plan: o.plan !== false };
    for (const f of [top, bottom, ...sides]) f.solid = s;
    this.solids.push(s);
    return s;
  };
  // Axis-aligned box from (x, y, z) with size w × d × h. Sides: 0 front (y = y), 1 right, 2 back, 3 left.
  S.box = function (x, y, z, w, d, h, c, o) { return w > 1e-6 && d > 1e-6 ? this.prism([[x, y], [x + w, y], [x + w, y + d], [x, y + d]], z, z + h, c, o) : null; };
  S.cyl = function (cx, cy, r, z0, z1, c, o, n = 28) { return this.prism(Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]), z0, z1, c, o); };
  // Plan marks, in metres on the ground: a dimension line (side +1 = below/right), a label, a polyline.
  // sc.mf tags new marks with a floor number; the plan only shows marks of sc.showFloor (untagged ones always).
  S.dim = function (a, b, text, side = 1) { this.marks.push({ k: 'dim', a, b, text, side, fl: this.mf }); };
  S.text = function (at, text, o = {}) { this.marks.push({ k: 'text', at, text, muted: !!o.muted, fl: this.mf }); };
  S.pline = function (pts, o = {}) { this.marks.push({ k: 'line', pts, dash: !!o.dash, glass: !!o.glass, fl: this.mf }); };
  // 3D view marks, drawn over the model. dim3: a dimension from 3D point a to b, moved out by off (metres) with
  // extension lines back to the part; the label sits on the far side. note3: a label at a 3D point.
  S.dim3 = function (a, b, text, off = [0, 0, 0]) { this.dims.push({ a, b, text, off }); };
  S.note3 = function (at, text) { this.dims.push({ a: at, text, off: [0, 0, 0] }); };

  // ---- Rendering helpers
  const VW = 400, VH = 300;
  const f1 = n => (Math.round(n * 10) / 10).toString();
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function normal(p) { // Newell's method: counter-clockwise (seen from outside) gives an outward normal
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  }
  function shade(hex, k) {
    const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * k)));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
  }
  const LIGHT = (() => { const v = [-0.45, 0.6, -0.65], l = Math.hypot(...v); return v.map(x => x / l); })(); // view space: right, up, depth

  // 3D: orthographic view turned by yaw (around the vertical) and tilted down by elev.
  // Each solid (or loose face) is one piece. Pieces are drawn by layer, and within a layer in true front-to-back order:
  // when two pieces overlap on screen, a face plane of one that has the other wholly on one side says which is nearer.
  // (Sorting faces by their middle point alone goes wrong for big flat pieces, like the floor between two stories.)
  function render3d(sc, cam) {
    // cam.noRoof hides the roof; cam.ground hides everything above the ground floor (faces tagged with a floor above 0).
    const faces = sc.faces.filter(f => !(cam.noRoof && f.tag === 'roof') && !(cam.ground && f.fl >= 1));
    if (!faces.length) return '';
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    // bounds of the whole scene, so hiding parts never changes the scale
    const dimPts = sc.dims.flatMap(d => [d.a, d.b].filter(Boolean).map(p => p.map((v, i) => v + d.off[i])));
    for (const p of [...sc.faces.flatMap(f => f.pts), ...dimPts]) for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], p[i]); hi[i] = Math.max(hi[i], p[i]); }
    const mid = lo.map((v, i) => (v + hi[i]) / 2), rad = Math.max(1e-3, Math.hypot(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2);
    const k = ((Math.min(VW, VH) * 0.58) / rad) * (cam.zoom || 1); // sized by the bounding sphere, so turning never changes the scale
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), ce = Math.cos(cam.elev), se = Math.sin(cam.elev);
    const view = ([x, y, z]) => {
      x -= mid[0]; y -= mid[1]; z -= mid[2];
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
      return [VW / 2 + x1 * k, VH / 2 - (z * ce + y1 * se) * k, y1 * ce - z * se];
    };
    const toEye = [-sy * ce, -cy * ce, se]; // world direction toward the viewer (depth grows away from it)
    // Group the faces into pieces.
    const pieces = new Map();
    for (const f of faces) {
      const key = f.solid || f;
      if (!pieces.has(key)) pieces.set(key, { faces: [], loose: !f.solid, layer: f.layer });
      pieces.get(key).faces.push(f);
    }
    const list = [];
    for (const pc of pieces.values()) {
      const drawn = [];
      const verts = [], seen = new Set();
      for (const f of pc.faces) {
        for (const p of f.pts) { const id = p.join(','); if (!seen.has(id)) { seen.add(id); verts.push(p); } }
        const n = normal(f.pts), nx = n[0] * cy - n[1] * sy, ny = n[0] * sy + n[1] * cy;
        let vn = [nx, n[2] * ce + ny * se, ny * ce - n[2] * se];
        if (vn[2] > 1e-6) { if (!f.two) continue; vn = vn.map(v => -v); } // facing away
        drawn.push({ f, p: f.pts.map(view), k: 0.6 + 0.45 * Math.max(0, vn[0] * LIGHT[0] + vn[1] * LIGHT[1] + vn[2] * LIGHT[2]) });
      }
      if (!drawn.length) continue;
      const sp = verts.map(view);
      pc.drawn = drawn;
      pc.verts = verts;
      pc.planes = pc.faces.map(f => ({ n: normal(f.pts), p: f.pts[0], two: pc.loose }));
      pc.box = [Math.min(...sp.map(q => q[0])), Math.min(...sp.map(q => q[1])), Math.max(...sp.map(q => q[0])), Math.max(...sp.map(q => q[1]))];
      pc.depth = sp.reduce((s, q) => s + q[2], 0) / sp.length;
      list.push(pc);
    }
    // -1: a is drawn before b (a is behind), 1: after, 0: no plane decides it.
    const EPS = 1e-4;
    const sep = (a, b) => {
      for (const { n, p, two } of a.planes) {
        const e = n[0] * toEye[0] + n[1] * toEye[1] + n[2] * toEye[2];
        if (Math.abs(e) < 1e-6) continue; // seen edge-on
        for (const sgn of two ? [1, -1] : [1]) {
          if (b.verts.every(q => sgn * ((q[0] - p[0]) * n[0] + (q[1] - p[1]) * n[1] + (q[2] - p[2]) * n[2]) >= -EPS)) return sgn * e > 0 ? -1 : 1;
        }
      }
      return 0;
    };
    const order = (a, b) => sep(a, b) || -sep(b, a);
    const out = [];
    for (const layer of [...new Set(list.map(p => p.layer))].sort((a, b) => a - b)) {
      const ps = list.filter(p => p.layer === layer).sort((a, b) => b.depth - a.depth); // far first, the fallback order
      const after = ps.map(() => []), need = ps.map(() => 0);
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const A = ps[i].box, B = ps[j].box;
        if (A[0] >= B[2] - 0.05 || B[0] >= A[2] - 0.05 || A[1] >= B[3] - 0.05 || B[1] >= A[3] - 0.05) continue; // no overlap on screen
        const o = order(ps[i], ps[j]);
        if (o < 0) { after[i].push(j); need[j]++; } else if (o > 0) { after[j].push(i); need[i]++; }
      }
      const done = ps.map(() => false);
      for (let c = 0; c < ps.length; c++) {
        let i = need.findIndex((x, n) => !done[n] && x === 0);
        if (i < 0) i = done.indexOf(false); // a loop (pieces that cut into each other): fall back to far first
        done[i] = true;
        for (const j of after[i]) need[j]--;
        out.push(ps[i]);
      }
    }
    let s = '';
    for (const pc of out) for (const { f, p, k: kk } of pc.drawn.sort((a, b) => b.p.reduce((s, q) => s + q[2], 0) / b.p.length - a.p.reduce((s, q) => s + q[2], 0) / a.p.length)) {
      s += `<polygon points="${p.map(q => f1(q[0]) + ',' + f1(q[1])).join(' ')}" fill="${shade(f.c, kk)}"${f.alpha < 1 ? ` fill-opacity="${f.alpha}"` : ''} stroke="rgba(0,0,0,.32)" stroke-width=".6" stroke-linejoin="round"/>`;
      if (f.deco && f.deco.length) s += `<path d="${f.deco.map(([a, b]) => { const A = view(a), B = view(b); return `M${f1(A[0])} ${f1(A[1])}L${f1(B[0])} ${f1(B[1])}`; }).join('')}" stroke="rgba(0,0,0,.3)" stroke-width=".7" fill="none"/>`;
    }
    const ln = (p, q, c = '') => `<line${c} x1="${f1(p[0])}" y1="${f1(p[1])}" x2="${f1(q[0])}" y2="${f1(q[1])}"/>`;
    for (const d of sc.dims) {
      if (!d.b) { const P = view(d.a); s += `<g class="d3"><text x="${f1(P[0])}" y="${f1(P[1] + 4)}" text-anchor="middle">${esc(d.text)}</text></g>`; continue; }
      const sh = p => view(p.map((v, i) => v + d.off[i])), A0 = view(d.a), B0 = view(d.b), A = sh(d.a), B = sh(d.b), len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (len < 0.5) continue; // seen end-on
      const u = [(B[0] - A[0]) / len, (B[1] - A[1]) / len], os = [A[0] - A0[0], A[1] - A0[1]], ol = Math.hypot(os[0], os[1]);
      const n = ol > 1 ? [os[0] / ol, os[1] / ol] : [-u[1], u[0]], t = [-u[1] * 4, u[0] * 4], out = (p, k) => [p[0] + n[0] * k, p[1] + n[1] * k];
      let ang = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
      if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
      const [tx, ty] = out([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], 9);
      s += `<g class="d3">${ol > 1 ? ln(A0, out(A, 3), ' class="ext"') + ln(B0, out(B, 3), ' class="ext"') : ''}${ln(A, B)}`
        + [A, B].map(p => ln([p[0] - t[0], p[1] - t[1]], [p[0] + t[0], p[1] + t[1]])).join('')
        + `<text x="${f1(tx)}" y="${f1(ty + 4)}" text-anchor="middle" transform="rotate(${f1(ang)} ${f1(tx)} ${f1(ty)})">${esc(d.text)}</text></g>`;
    }
    return s;
  }

  // Plan: looking straight down. Solids that pass through the cut height (walls, in a house) are drawn as solid
  // sections, like a floor plan; everything lower is drawn in outline; anything above the cut is left out.
  // sc.cutLow leaves out solids that end below it (the ground floor, when the upper floor is shown).
  function renderPlan(sc) {
    const cut = sc.cut, low = sc.cutLow == null ? -Infinity : sc.cutLow, items = sc.solids.filter(s => s.plan && s.z0 <= cut && s.z1 > low);
    const marks = sc.marks.filter(m => m.fl == null || m.fl === (sc.showFloor || 0));
    const pts = [];
    for (const s of items) pts.push(...s.foot);
    for (const m of marks) pts.push(...(m.k === 'line' ? m.pts : m.k === 'text' ? [m.at] : [m.a, m.b]));
    if (!pts.length) return '';
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), pad = 40;
    const k = Math.min((VW - 2 * pad) / Math.max(x1 - x0, 1e-3), (VH - 2 * pad) / Math.max(y1 - y0, 1e-3));
    const ox = (VW - (x1 - x0) * k) / 2, oy = (VH - (y1 - y0) * k) / 2;
    const P = ([x, y]) => [ox + (x - x0) * k, VH - oy - (y - y0) * k];
    sc.xf = { k, ox, oy, x0, y0 }; // drawing position of the ground, for the floor plan editor
    const poly = (foot, fill, stroke, w = 1) => `<polygon points="${foot.map(P).map(q => f1(q[0]) + ',' + f1(q[1])).join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${w}"/>`;
    let s = '';
    // The floor below, faintly, so walls on the upper floor can be lined up with it.
    if (sc.ghostCut != null) for (const it of sc.solids) if (it.plan && it.tag !== 'glass' && it.z0 <= sc.ghostCut && it.z1 >= sc.ghostCut && it.z1 <= low) s += poly(it.foot, 'rgba(214,232,255,.16)', 'rgba(214,232,255,.3)', 0.6);
    const section = x => x.z1 >= cut && cut < Infinity;
    items.sort((a, b) => section(a) - section(b) || a.z1 - b.z1);
    for (const it of items) {
      if (section(it)) s += it.tag === 'glass' ? poly(it.foot, '#1c4e86', 'none', 0) : poly(it.foot, '#eaf2ff', '#ffffff', 0.8); // a window shows as a gap
      else {
        s += poly(it.foot, 'rgba(255,255,255,.07)', 'rgba(214,232,255,.85)');
        if (it.top.deco && it.top.deco.length) s += `<path d="${it.top.deco.map(([a, b]) => { const A = P(a), B = P(b); return `M${f1(A[0])} ${f1(A[1])}L${f1(B[0])} ${f1(B[1])}`; }).join('')}" stroke="rgba(214,232,255,.4)" stroke-width=".7" fill="none"/>`;
      }
    }
    for (const m of marks) {
      if (m.k === 'line') s += `<polyline points="${m.pts.map(P).map(q => f1(q[0]) + ',' + f1(q[1])).join(' ')}" fill="none" stroke="${m.glass ? '#7fd8ff' : '#d6e8ff'}" stroke-width="${m.glass ? 1.4 : 0.9}"${m.dash ? ' stroke-dasharray="4 3"' : ''}/>`;
      else if (m.k === 'text') { const [x, y] = P(m.at); s += `<text x="${f1(x)}" y="${f1(y + 4)}" text-anchor="middle" class="pl-t${m.muted ? ' mu' : ''}">${esc(m.text)}</text>`; }
      else {
        const A = P(m.a), B = P(m.b), len = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1, d = [(B[0] - A[0]) / len, (B[1] - A[1]) / len];
        const n = [-d[1] * 18 * m.side, d[0] * 18 * m.side], a = [A[0] + n[0], A[1] + n[1]], b = [B[0] + n[0], B[1] + n[1]];
        let ang = (Math.atan2(d[1], d[0]) * 180) / Math.PI;
        if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
        const tx = (a[0] + b[0]) / 2 + n[0] * 0.55, ty = (a[1] + b[1]) / 2 + n[1] * 0.55;
        s += `<g class="pl-d"><line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}"/>`
          + [a, b].map(p => `<line x1="${f1(p[0] - d[1] * 4)}" y1="${f1(p[1] + d[0] * 4)}" x2="${f1(p[0] + d[1] * 4)}" y2="${f1(p[1] - d[0] * 4)}"/>`).join('')
          + `<text x="${f1(tx)}" y="${f1(ty + 4)}" text-anchor="middle" transform="rotate(${f1(ang)} ${f1(tx)} ${f1(ty)})">${esc(m.text)}</text></g>`;
      }
    }
    return s;
  }

  // ---- Shared pieces
  // Lines on a flat rectangle, in rows of b with joints every a (rows shift by `stagger` of a). Coarser past ~2,500 units.
  function grid(x0, y0, L, W, a, b, stagger, z, along = 'x') {
    if (!(a > 0 && b > 0 && L > 0 && W > 0)) return [];
    const n = (L / a) * (W / b);
    if (n > 2500) { const f = Math.sqrt(n / 2500); a *= f; b *= f; }
    const seg = [], P = (u, v) => (along === 'x' ? [x0 + u, y0 + v, z] : [x0 + v, y0 + u, z]);
    const U = along === 'x' ? L : W, V2 = along === 'x' ? W : L;
    for (let r = 0; r * b < V2 - 1e-9; r++) {
      const v0 = r * b, v1 = Math.min(V2, v0 + b);
      if (r) seg.push([P(0, v0), P(U, v0)]);
      const off = ((r * stagger) % 1) * a;
      for (let u = off > 1e-9 ? a - off : a; u < U - 1e-9; u += a) seg.push([P(u, v0), P(u, v1)]);
    }
    return seg;
  }
  // A masonry wall along x, front face at y = 0, with course and head joints drawn on the front.
  function masonry(sc, L, H, T, uL, uH, c, z0 = 0) {
    const s = sc.box(0, 0, z0, L, T, H, c);
    if (!s || !(uL > 0 && uH > 0)) return s;
    const seg = [], rows = H / uH, dense = rows * (L / uL) < 2500;
    for (let k = 0; k * uH < H - 1e-9; k += dense ? 1 : Math.ceil(rows / 60)) {
      if (k) seg.push([[0, 0, z0 + k * uH], [L, 0, z0 + k * uH]]);
      if (dense) for (let x = k % 2 ? uL / 2 : uL; x < L - 1e-9; x += uL) seg.push([[x, 0, z0 + k * uH], [x, 0, z0 + Math.min(H, (k + 1) * uH)]]);
    }
    s.sides[0].deco = seg;
    return s;
  }
  // Length × width dimensions under and to the right of a rectangle.
  const dims = (sc, h, L, W, x = 0, y = 0) => { sc.dim([x, y], [x + L, y], h.len(L), 1); sc.dim([x + L, y], [x + L, y + W], h.len(W), 1); };

  // A wall along x (ax 'x', thickness t toward +y) or y (thickness toward +x), split around its openings.
  // items: { kind: 'door' | 'garage' | 'window', w, sill, top, at? (center) }; swing: which side doors open to (+1 / -1).
  function wallRun(sc, ax, x0, y0, len, z0, H, t, items, c, swing = 1) {
    const B = (u0, u1, za, zb, col = c, o, tt = t, off = 0) => (u1 - u0 > 1e-4 && zb - za > 1e-4)
      && (ax === 'x' ? sc.box(x0 + u0, y0 + off, za, u1 - u0, tt, zb - za, col, o) : sc.box(x0 + off, y0 + u0, za, tt, u1 - u0, zb - za, col, o));
    const at = (u, v) => (ax === 'x' ? [x0 + u, y0 + v] : [x0 + v, y0 + u]);
    let list = items.filter(i => i.at != null || i.w < len - 0.1);
    const total = list.reduce((s, i) => s + i.w, 0);
    if (total > len * 0.92 && list.some(i => i.at == null)) list = list.filter(i => i.kind !== 'window'); // no room: keep the doors (placed openings were already checked)
    const gap = (len - list.reduce((s, i) => s + i.w, 0)) / (list.length + 1);
    let u = 0, cur = gap;
    for (const it of list) {
      const a = it.at != null ? Math.max(u + 0.05, it.at - it.w / 2) : cur, b = a + it.w;
      if (b > len - 0.02) break;
      B(u, a, z0, z0 + H);
      B(a, b, z0 + it.top, z0 + H);
      if (it.kind === 'window') {
        B(a, b, z0, z0 + it.sill);
        B(a, b, z0 + it.sill, z0 + it.top, COL.glass, { tag: 'glass' }, t * 0.2, t * 0.4);
        for (const v of [0.25, 0.75]) sc.pline([at(a, t * v), at(b, t * v)], { glass: true }); // plan symbol: two lines of glass across the opening
      } else {
        B(a, b, z0, z0 + it.top - 0.01, it.kind === 'garage' ? COL.board : COL.door, { plan: false }, 0.04, swing > 0 ? t - 0.05 : 0.01);
        if (it.kind === 'garage') sc.pline([at(a, t / 2), at(b, t / 2)], { dash: true });
        else { // door swing: the leaf open at 90° and the arc it sweeps
          const face = swing > 0 ? t : 0, hinge = at(a, face), arc = [];
          for (let i = 0; i <= 8; i++) { const th = (i / 8) * (Math.PI / 2); arc.push(at(a + it.w * Math.cos(th), face + swing * it.w * Math.sin(th))); }
          sc.pline([hinge, at(a, face + swing * it.w)]);
          sc.pline(arc);
        }
      }
      u = b; cur = b + gap;
    }
    B(u, len, z0, z0 + H);
  }
  // Roof over a W-wide, L-long building whose wall tops are at zTop: gable (two slopes) or hip (four), with overhang o.
  // kind: 0 shingles (courses along the eave), 1 metal (ribs from eave to ridge), 2 tiles (closer courses), in the roof's colour.
  function roof(sc, L, W, zTop, r, o, hip, wallC, kind = 0) {
    const zE = zTop - o * r, ym = W / 2, zR = zTop + ym * r, x0 = -o, x1 = L + o, y0 = -o, y1 = W + o, op = { tag: 'roof', two: true, layer: 2 };
    const c = [COL.roof, COL.metal, COL.tileRoof][kind] || COL.roof;
    const lerp = (p, q, t) => p.map((v, i) => v + (q[i] - v) * t);
    const courses = (a, b, c2, d) => { // lines parallel to the eave a-b
      const n = kind === 2 ? 14 : 8;
      return Array.from({ length: n - 1 }, (_, i) => [lerp(a, d, (i + 1) / n), lerp(b, c2, (i + 1) / n)]);
    };
    // Metal panel ribs: about every 0.9 m along the eave (the face's first edge), straight up the slope until they meet
    // the ridge or a hip, so they stay parallel like real panels.
    const ribs = pts => {
      const [a, b] = pts, ex = b[0] - a[0], ey = b[1] - a[1], el = Math.hypot(ex, ey) || 1;
      let dx = -ey / el, dy = ex / el;
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      if ((cx - a[0]) * dx + (cy - a[1]) * dy < 0) { dx = -dx; dy = -dy; }
      const n = Math.min(80, Math.max(2, Math.round(el / 0.9))), out = [];
      for (let i = 1; i < n; i++) {
        const S = lerp(a, b, i / n);
        let best = null;
        for (let j = 1; j < pts.length; j++) {
          const P = pts[j], Q = pts[(j + 1) % pts.length], Ex = Q[0] - P[0], Ey = Q[1] - P[1], den = dx * Ey - dy * Ex;
          if (Math.abs(den) < 1e-9) continue;
          const wx = P[0] - S[0], wy = P[1] - S[1], t = (wx * Ey - wy * Ex) / den, u = (wx * dy - wy * dx) / den;
          if (t > 1e-6 && u >= -1e-6 && u <= 1 + 1e-6 && (!best || t < best.t)) best = { t, p: lerp(P, Q, Math.min(1, Math.max(0, u))) };
        }
        if (best) out.push([S, best.p]);
      }
      return out;
    };
    const lines = q => (kind === 1 ? ribs(q) : courses(...(q.length === 3 ? [q[0], q[1], q[2], q[2]] : q)).slice(0, kind === 2 ? 13 : 7));
    if (!hip) {
      const q1 = [[x0, y0, zE], [x1, y0, zE], [x1, ym, zR], [x0, ym, zR]], q2 = [[x1, y1, zE], [x0, y1, zE], [x0, ym, zR], [x1, ym, zR]];
      sc.face(q1, c, { ...op, deco: lines(q1) });
      sc.face(q2, c, { ...op, deco: lines(q2) });
      for (const x of [0, L]) sc.face([[x, 0, zTop], [x, W, zTop], [x, ym, zR]], wallC, { two: true }); // gable walls
    } else {
      const a = Math.min(ym, L / 2), b = L - a, zr = zTop + Math.min(ym, L / 2) * r;
      const R1 = [a, ym, zr], R2 = [b, ym, zr];
      const front = [[x0, y0, zE], [x1, y0, zE], R2, R1], back = [[x1, y1, zE], [x0, y1, zE], R1, R2];
      sc.face(front, c, { ...op, deco: lines(front) });
      sc.face(back, c, { ...op, deco: lines(back) });
      sc.face([[x0, y1, zE], [x0, y0, zE], R1], c, { ...op, deco: lines([[x0, y1, zE], [x0, y0, zE], R1]) });
      sc.face([[x1, y0, zE], [x1, y1, zE], R2], c, { ...op, deco: lines([[x1, y0, zE], [x1, y1, zE], R2]) });
    }
  }
  // Simple room for the paint, drywall and baseboard views: the two walls nearest the default camera are cut low.
  function room(sc, v, wallC, o = {}) {
    const t = 0.1, L = v.L, W = v.W, H = v.H || 8 * FT, low = H * 0.3;
    sc.cut = 1.2;
    sc.box(-t, -t, -0.05, L + 2 * t, W + 2 * t, 0.05, COL.floor, { layer: 0 });
    const back = sc.box(0, W, 0, L, t, H, wallC), left = sc.box(-t, -t, 0, t, W + 2 * t, H, wallC);
    sc.box(0, -t, 0, L + t, t, low, wallC);
    sc.box(L, 0, 0, t, W + t, low, wallC);
    const doors = Math.min(Math.round(v.doors || 0), 4), wins = Math.min(Math.round(v.windows || 0), 4);
    for (let i = 0; i < doors; i++) { const x = (L * (i + 1)) / (doors + 1) - 0.45; sc.box(x, W - 0.02, 0, 0.9, 0.04, 2.03, COL.door, { plan: false }); }
    for (let i = 0; i < wins; i++) { const y = (W * (i + 1)) / (wins + 1) - 0.6; sc.box(0.001, y, 0.9, 0.03, 1.2, 1.2, COL.glass, { plan: false }); }
    if (o.seams && back) { back.sides[0].deco = grid(0, 0, L, H, 4 * FT, H, 0, 0).map(([a, b]) => [[a[0], W, a[1]], [b[0], W, b[1]]]); }
    if (o.trim) {
      const d = o.trim, gaps = Array.from({ length: doors }, (_, i) => (L * (i + 1)) / (doors + 1));
      let x = 0;
      for (const g of gaps) { sc.box(x, W - d, 0, g - 0.45 - x, d, 0.1, COL.trim); x = g + 0.45; }
      sc.box(x, W - d, 0, L - x, d, 0.1, COL.trim);
      sc.box(0, 0, 0, d, W - d, 0.1, COL.trim);
    }
    dims(sc, { len: o.len }, L, W);
    return { back, left };
  }

  // ---- House. The layout is data, so visitors can draw their own (house-plan.js) and the estimate can count it:
  // plan = { floors: [{ ext: [front, back, left, right] lists of openings, walls: [inside walls], rooms: [labels] }] }
  //   opening { kind: 'door' | 'window' | 'garage', c, w }: c is its middle, measured along the wall's axis from the house corner
  //   inside wall { a: [x, y], b: [x, y], items: [openings] }: a centre line along x or y, in metres from the corner
  //   room { at: [x, y], name }
  const OPEN = { door: { sill: 0, top: 2.03 }, window: { sill: 0.9, top: 2.1 }, garage: { sill: 0, top: 7 * FT } };
  const WIDTH = { door: 0.91, idoor: 0.81, window: 0.9, garage: 16 * FT };
  const TI = 0.1; // inside wall thickness (2×4 with drywall)
  const BAND = 0.3; // floor between stories
  const r3 = x => Math.round(x * 1000) / 1000;
  const houseT = v => (v.walls === 8 ? 0.2 : v.walls === 6 ? 0.19 : 0.14); // 8 in block, 2×6 or 2×4 with sheathing and drywall
  // The four outside walls: axis, where the run starts (s) along that axis, its length, and which side doors swing to.
  function extWalls(L, W, t) {
    return [{ ax: 'x', x: 0, y: 0, s: 0, len: L, sw: 1 }, { ax: 'x', x: 0, y: W - t, s: 0, len: L, sw: -1 },
      { ax: 'y', x: 0, y: t, s: t, len: W - 2 * t, sw: 1 }, { ax: 'y', x: L - t, y: t, s: t, len: W - 2 * t, sw: -1 }];
  }
  // Openings that fit a wall run starting at s and len long: in order, not overlapping, not past the ends.
  function fitItems(items, s, len) {
    const out = [];
    let u = 0.02;
    for (const it of items.slice().sort((a, b) => a.c - b.c)) {
      const a = it.c - s - it.w / 2;
      if (a < u || a + it.w > len - 0.02) continue;
      out.push({ ...OPEN[it.kind], ...it, at: it.c - s });
      u = a + it.w + 0.05;
    }
    return out;
  }
  // Inside walls as drawn: kept inside the outside walls, along x or y, and stopped at the face of any wall they run into.
  // Each comes back as { w (the data), ax (0 along x, 1 along y), p (its centre line), a..b (its run), len }.
  function insideWalls(fl, L, W, t) {
    const lo = [t, t], hi = [L - t, W - t], out = [];
    const ws = (fl.walls || []).map(w => {
      const ax = Math.abs(w.b[0] - w.a[0]) >= Math.abs(w.b[1] - w.a[1]) ? 0 : 1, o = 1 - ax;
      const p = Math.min(Math.max(w.a[o], lo[o] + TI / 2), hi[o] - TI / 2);
      return { w, ax, p, a: Math.max(Math.min(w.a[ax], w.b[ax]), lo[ax]), b: Math.min(Math.max(w.a[ax], w.b[ax]), hi[ax]) };
    });
    for (const q of ws) {
      let a = q.a, b = q.b;
      for (const r of ws) if (r !== q && r.ax !== q.ax && q.p > r.a - 1e-6 && q.p < r.b + 1e-6) {
        if (Math.abs(a - r.p) < TI / 2 + 1e-6) a = r.p + TI / 2;
        if (Math.abs(b - r.p) < TI / 2 + 1e-6) b = r.p - TI / 2;
      }
      if (b - a > 0.05) out.push({ ...q, a, b, len: b - a });
    }
    return out;
  }
  // Counts per floor for the estimate, from the openings that actually fit (the same ones the drawing shows).
  function planCounts(v, plan, st) {
    const t = houseT(v), ext = extWalls(v.L, v.W, t);
    return Array.from({ length: st }, (_, f) => {
      const fl = plan.floors[f] || {}, c = { I: 0, doors: 0, gdoors: 0, idoors: 0, windows: 0 };
      ext.forEach((w, n) => fitItems((fl.ext || [])[n] || [], w.s, w.len).forEach(it => { c[it.kind === 'garage' ? 'gdoors' : it.kind === 'door' ? 'doors' : 'windows']++; }));
      for (const q of insideWalls(fl, v.L, v.W, t)) {
        c.I += q.len;
        c.idoors += fitItems(q.w.items || [], q.a, q.len).filter(it => it.kind === 'door').length;
      }
      return c;
    });
  }
  // The sample plan: openings spread along the outside walls, and a few inside walls from the total length o.I.
  function samplePlan(L, W, t, o) {
    const st = o.stories || 1, share = (n, f) => Math.floor(n / st) + (f < n % st ? 1 : 0), floors = [];
    for (let f = 0; f < st; f++) {
      const ext = extWalls(L, W, t).map(w => ({ ...w, items: [] }));
      if (!f) {
        for (let i = 0; i < Math.min(o.gdoors || 0, 4); i++) ext[0].items.push({ kind: 'garage', w: WIDTH.garage });
        for (let i = 0; i < Math.min(o.doors || 0, 4); i++) ext[i % 2].items.push({ kind: 'door', w: WIDTH.door });
      }
      const used = w => w.items.reduce((s, i) => s + i.w + 0.6, 0.6);
      for (let i = 0; i < Math.min(share(o.windows || 0, f), 40); i++) {
        const w = ext.reduce((best, x) => (x.len - used(x) > best.len - used(best) ? x : best));
        if (w.len - used(w) < 1.5) break;
        w.items.push({ kind: 'window', w: WIDTH.window });
      }
      const fl = { ext: [], walls: [], rooms: [] };
      for (const w of ext) { // windows either side of the doors, evenly spaced
        const win = w.items.filter(i => i.kind === 'window'), rest = w.items.filter(i => i.kind !== 'window'), half = Math.ceil(win.length / 2);
        let list = [...win.slice(0, half), ...rest, ...win.slice(half)].filter(i => i.w < w.len - 0.1);
        if (list.reduce((s, i) => s + i.w, 0) > w.len * 0.92) list = list.filter(i => i.kind !== 'window'); // no room: keep the doors
        const gap = (w.len - list.reduce((s, i) => s + i.w, 0)) / (list.length + 1);
        let u = 0;
        fl.ext.push(list.map(i => { u += gap; const c = w.s + u + i.w / 2; u += i.w; return { kind: i.kind, c: r3(c), w: i.w }; }));
      }
      if (o.layout) sampleInside(fl, L, W, t, (o.I || 0) / st, share(o.idoors || 0, f), f, o.name);
      floors.push(fl);
    }
    return { floors };
  }
  // A sample floor plan from the total length of inside walls: a "spine" wall with bedrooms behind it when there is
  // enough wall, otherwise cross walls. It is only an illustration of where the walls might go.
  function sampleInside(fl, L, W, t, I, nd, f, name) {
    const x0 = t, y0 = t, iL = L - 2 * t, iW = W - 2 * t;
    let left = Math.round(nd);
    const door = c => (left-- > 0 ? [{ kind: 'door', c: r3(c), w: WIDTH.idoor }] : []);
    const wall = (a, b, items = []) => fl.walls.push({ a: a.map(r3), b: b.map(r3), items });
    const upper = { Kitchen: 'Bedroom', Living: 'Family room', 'Living · Kitchen': 'Family room' };
    const room = (x, y, n) => fl.rooms.push({ at: [r3(x), r3(y)], name: f ? upper[n] || n : n });
    if (I < 0.5 || iL < 2 || iW < 2) room(L / 2, W / 2, name || 'Open plan');
    else if (I >= 0.6 * L && iW > 4) {
      const ys = y0 + iW * 0.55, dB = W - t - ys - TI;
      let R = I - iL;
      // Rooms are at least about 10 ft (3 m) wide; in a real plan the rest of the wall goes to closets and halls.
      const m = Math.max(1, Math.min(Math.floor(R / dB) + 1, Math.floor(iL / 3), 8)), k = m - 1, rw = iL / m;
      R -= k * dB;
      wall([x0, ys + TI / 2], [L - t, ys + TI / 2], Array.from({ length: m }, (_, j) => door(x0 + (j + 0.5) * rw)).flat());
      for (let j = 1; j <= k; j++) wall([x0 + j * rw, ys + TI], [x0 + j * rw, W - t]);
      const names = m === 1 ? ['Bedroom'] : m === 2 ? ['Bedroom', 'Bath'] : ['Bedroom 1', 'Bath', 'Bedroom 2', 'Bedroom 3', 'Laundry', 'Bedroom 4', 'Office', 'Bath 2'];
      for (let j = 0; j < m; j++) room(x0 + (j + 0.5) * rw, (ys + TI + W - t) / 2, names[j]);
      if (R >= (ys - y0) * 0.8) {
        const xs = x0 + iL * 0.42;
        wall([xs + TI / 2, y0], [xs + TI / 2, ys], door(y0 + (ys - y0) / 2));
        room((x0 + xs) / 2, (y0 + ys) / 2, 'Kitchen');
        room((xs + L - t) / 2, (y0 + ys) / 2, 'Living');
      } else room(L / 2, (y0 + ys) / 2, 'Living · Kitchen');
    } else {
      const k = Math.max(1, Math.min(Math.floor(I / iW), Math.floor(iL / 3) - 1, 7)), rw = iL / (k + 1);
      for (let j = 1; j <= k; j++) wall([x0 + j * rw, y0], [x0 + j * rw, W - t], door(y0 + iW / 2));
      const names = ['Bedroom', 'Living · Kitchen', 'Bath', 'Bedroom 2', 'Storage', 'Office', 'Bedroom 3', 'Laundry'];
      for (let j = 0; j <= k; j++) room(x0 + (j + 0.5) * rw, W / 2, k === 1 ? ['Bedroom', 'Living · Kitchen'][j] : names[j]);
    }
  }
  // Draws a house from a plan: slab, each story's walls and openings, the floor between stories, and the roof.
  // o.floor picks the story the plan view shows.
  function drawHouse(sc, v, h, plan, o) {
    const st = o.stories || 1, L = v.L, W = v.W, t = o.t, wallC = o.wallC || COL.siding, show = Math.max(0, Math.min(o.floor || 0, st - 1));
    // o.Hs: each story's wall height (else o.H for all); z(f) is where story f starts.
    const Hf = f => (o.Hs && o.Hs[f] > 0.5 ? o.Hs[f] : o.H), z = f => Array.from({ length: f }, (_, g) => Hf(g) + BAND).reduce((s, x) => s + x, 0);
    sc.cut = z(show) + 1.2;
    if (show) { sc.cutLow = z(show) - BAND / 2; sc.ghostCut = z(show - 1) + 1.2; }
    sc.floors = st;
    sc.showFloor = show;
    sc.box(-0.1, -0.1, -0.25, L + 0.2, W + 0.2, 0.25, COL.concrete, { layer: 0 });
    for (let f = 0; f < st; f++) {
      const z0 = z(f), H = Hf(f), fl = plan.floors[f] || {};
      sc.mf = f;
      if (f) sc.box(0, 0, z0 - BAND, L, W, BAND, wallC);
      extWalls(L, W, t).forEach((w, n) => wallRun(sc, w.ax, w.x, w.y, w.len, z0, H, t, fitItems((fl.ext || [])[n] || [], w.s, w.len), wallC, w.sw));
      for (const q of insideWalls(fl, L, W, t)) {
        const items = fitItems(q.w.items || [], q.a, q.len);
        if (q.ax === 0) wallRun(sc, 'x', q.a, q.p - TI / 2, q.len, z0, H, TI, items, COL.wall, 1);
        else wallRun(sc, 'y', q.p - TI / 2, q.a, q.len, z0, H, TI, items, COL.wall, 1);
      }
      for (const r of fl.rooms || []) if (r.at[0] > 0 && r.at[0] < L && r.at[1] > 0 && r.at[1] < W) sc.text(r.at, r.name);
    }
    const top = z(st - 1) + Hf(st - 1);
    sc.mf = st; // the roof sits on the top floor: hidden with the upper floor
    roof(sc, L, W, top, o.r, o.over, o.hip, wallC, o.roofing);
    sc.mf = undefined;
    dims(sc, h, L, W);
    return top;
  }
  // Outside walls with spread-out doors and windows (and a sample layout when o.layout), for the house, paint and siding views.
  function houseShell(sc, v, h, o) { return drawHouse(sc, v, h, samplePlan(v.L, v.W, o.t, o), o); }

  // ---- One builder per calculator. v: the calculator's values; h.len formats a length in the visitor's units.
  const bulk = c => (v, sc, h) => { if (sc.box(0, 0, 0, v.L, v.W, v.D, c)) dims(sc, h, v.L, v.W); };
  const BRICK = [[8 * IN, (8 / 3) * IN, 3.625 * IN], [8.375 * IN, 2.625 * IN, 3.75 * IN], [0.225, 0.075, 0.1025]];
  const BLOCK = [[16 * IN, 8 * IN, 7.625 * IN], [0.45, 0.225, 0.1]];
  const DENS = [[1.3, COL.soil], [1.68, COL.gravel], [1.6, COL.sand], [0.36, COL.mulch], [2.4, COL.concrete]];
  const views = {
    // h.plan: the visitor's own layout (else the sample from the numbers); h.floor: the story the plan view shows.
    'house-material-calculator': (v, sc, h) => {
      if (!(v.L > 0.5 && v.W > 0.5 && v.H > 0.5)) return;
      const st = v.stories || 1, t = houseT(v);
      const o = { stories: st, H: v.H, Hs: [v.H, v.H2], t, roofing: v.roofing, wallC: [COL.siding, COL.fiber, COL.stucco, COL.brick][v.siding] || COL.siding, r: Math.sqrt(v.pitch ** 2 - 1), over: v.over, hip: v.roof === 1, floor: h.floor,
        doors: v.doors, gdoors: v.gdoors, windows: v.windows, layout: true, I: v.I, idoors: v.idoors, name: v.gdoors ? 'Garage' : v.L * v.W < 20 ? 'Storage' : 'Open plan' };
      drawHouse(sc, v, h, h.plan || samplePlan(v.L, v.W, t, o), o);
      sc.mf = sc.showFloor;
      sc.text([v.L / 2, v.W + 1.2], (h.plan ? 'Your layout' : 'Sample layout') + (st > 1 ? (sc.showFloor ? ' · upper floor' : ' · ground floor') : ''), { muted: true });
      sc.mf = undefined;
    },
    'concrete-calculator': (v, sc, h) => {
      if (v.shape === 1) { if (sc.cyl(v.D / 2, v.D / 2, v.D / 2, 0, v.T, COL.concrete)) sc.dim([0, 0], [v.D, 0], 'Ø ' + h.len(v.D)); }
      else if (v.shape === 2) {
        const n = Math.min(Math.round(v.N), 30);
        for (let i = 0; i < n; i++) sc.box(0, i * v.RUN, 0, v.W, v.RUN, (i + 1) * v.R, COL.concrete);
        if (n > 0) dims(sc, h, v.W, n * v.RUN);
      } else if (sc.box(0, 0, 0, v.L, v.W, v.T, COL.concrete)) dims(sc, h, v.L, v.W);
    },
    'concrete-column-calculator': (v, sc, h) => {
      const n = Math.max(1, Math.min(Math.round(v.N) || 1, 8)), gap = v.D * 2.5;
      for (let i = 0; i < n; i++) {
        const cx = v.D / 2 + i * gap;
        sc.cyl(cx, v.D / 2, v.D / 2, -v.H, 0, COL.concrete);
        if (v.P > 0) sc.box(cx - v.P / 2, v.D / 2 - v.P / 2, -v.H + 0.15, v.P, v.P, v.H * 2.2, COL.wood);
      }
      sc.dim([0, 0], [v.D, 0], 'Ø ' + h.len(v.D));
    },
    'concrete-block-calculator': (v, sc, h) => { const [a, b, d] = BLOCK[v.B] || BLOCK[0]; if (masonry(sc, v.L, v.H, d, a, b, COL.block)) sc.dim([0, 0], [v.L, 0], h.len(v.L)); },
    'brick-calculator': (v, sc, h) => { const [a, b, d] = BRICK[v.B] || BRICK[0]; if (masonry(sc, v.L, v.H, d * v.layers + (v.layers - 1) * 0.01, a, b, COL.brick)) sc.dim([0, 0], [v.L, 0], h.len(v.L)); },
    'mortar-calculator': (v, sc, h) => {
      const u = [...BRICK, ...BLOCK][v.U] || BRICK[0];
      if (masonry(sc, v.L, v.H, u[2] * v.layers, u[0], u[1], v.U > 2 ? COL.block : COL.brick)) sc.dim([0, 0], [v.L, 0], h.len(v.L));
    },
    'retaining-wall-calculator': (v, sc, h) => {
      if (!(v.L > 0 && v.BH > 0 && v.BD > 0 && v.BL > 0)) return;
      const courses = Math.min(Math.ceil(v.H / v.BH - 1e-9) + 1, 40), top = (courses - 1) * v.BH;
      sc.box(-6 * IN, -6 * IN, -v.BH - 6 * IN, v.L + 12 * IN, v.BD + 12 * IN, 6 * IN, COL.gravel, { layer: 0 });
      masonry(sc, v.L, courses * v.BH, v.BD, v.BL, v.BH, COL.block, -v.BH);
      if (v.CL > 0) sc.box(-0.02, -0.03, top, v.L + 0.04, v.BD + 0.05, 0.08, COL.slab);
      sc.box(0, v.BD, -v.BH, v.L, 12 * IN, top + v.BH - 0.08, COL.gravel);
      sc.box(0, v.BD + 12 * IN, -v.BH, v.L, 0.6, top + v.BH - 0.08, COL.soil);
      sc.dim([0, 0], [v.L, 0], h.len(v.L));
    },
    'rebar-calculator': (v, sc, h) => {
      if (!(v.S > 0 && v.L > 0 && v.W > 0)) return;
      const d = Math.max([0.375 * IN, 0.5 * IN, 0.625 * IN, 0.01, 0.012, 0.016][v.size] || 0.0127, Math.max(v.L, v.W) / 250), T = 4 * IN;
      const a = Math.max(0, v.L - 2 * v.E), b = Math.max(0, v.W - 2 * v.E);
      const along = Math.min(Math.floor(b / v.S + 1e-9) + 1, 120), across = Math.min(Math.floor(a / v.S + 1e-9) + 1, 120);
      for (let i = 0; i < along; i++) sc.box(v.E, v.E + i * v.S - d / 2, T / 2 - d, a, d, d, COL.steel);
      for (let i = 0; i < across; i++) sc.box(v.E + i * v.S - d / 2, v.E, T / 2, d, b, d, COL.steel);
      sc.box(0, 0, 0, v.L, v.W, T, COL.concrete, { layer: 2, alpha: 0.3 });
      dims(sc, h, v.L, v.W);
    },
    'gravel-calculator': bulk(COL.gravel),
    'topsoil-calculator': bulk(COL.soil),
    'mulch-calculator': bulk(COL.mulch),
    'sand-calculator': bulk(COL.sand),
    'cubic-yard-calculator': (v, sc, h) => {
      const [t, c] = DENS[v.mat] || DENS[0];
      if (v.mode === 0) { bulk(c)(v, sc, h); return; }
      const V = v.mode === 1 ? v.V : v.T / (t * 1000), s = Math.cbrt(Math.max(V, 0));
      if (sc.box(0, 0, 0, s, s, s, c)) dims(sc, h, s, s);
    },
    'paver-calculator': (v, sc, h) => {
      if (!(v.L > 0 && v.W > 0)) return;
      if (v.base > 0) sc.box(0, 0, -v.base - v.sand, v.L, v.W, v.base, COL.gravel, { layer: 0 });
      if (v.sand > 0) sc.box(0, 0, -v.sand, v.L, v.W, v.sand, COL.sand, { layer: 0 });
      const s = sc.box(0, 0, 0, v.L, v.W, 0.06, COL.paver);
      if (s) s.top.deco = grid(0, 0, v.L, v.W, v.PL + v.gap, v.PW + v.gap, 0.5, 0.06);
      dims(sc, h, v.L, v.W);
    },
    'sod-calculator': (v, sc, h) => { const s = sc.box(0, 0, 0, v.L, v.W, 0.04, COL.grass); if (s) { s.top.deco = grid(0, 0, v.L, v.W, 5 * FT, 2 * FT, 0.5, 0.04); dims(sc, h, v.L, v.W); } },
    'fence-calculator': (v, sc, h) => {
      if (!(v.S > 0 && v.L > 0)) return;
      const Hf = 6 * FT, p = 3.5 * IN, posts = Math.min(Math.ceil(v.L / v.S - 1e-9), 60), Lr = Math.min(v.L, posts * v.S), R = Math.max(1, Math.min(Math.round(v.R), 6));
      for (let i = 0; i <= posts; i++) sc.box(Math.min(i * v.S, Lr) - p / 2, -p / 2, 0, p, p, Hf + 4 * IN, COL.post);
      for (let k = 0; k < R; k++) sc.box(0, p / 2 - 1.5 * IN, R > 1 ? 0.25 + (k * (Hf - 0.55)) / (R - 1) : Hf / 2, Lr, 1.5 * IN, 3.5 * IN, COL.wood2);
      const n = Lr / (6 * IN);
      if (n <= 160) for (let i = 0; i < n - 0.5; i++) sc.box(i * 6 * IN, -p / 2 - 0.75 * IN, 2 * IN, 5.5 * IN, 0.75 * IN, Hf - 2 * IN, COL.wood);
      else { const s = sc.box(0, -p / 2 - 0.75 * IN, 2 * IN, Lr, 0.75 * IN, Hf - 2 * IN, COL.wood); if (s) s.sides[0].deco = grid(0, 0, Lr, Hf, 6 * IN * Math.ceil(n / 160), Hf, 0, 0).map(([a, b]) => [[a[0], -p / 2 - 0.75 * IN, a[1] + 2 * IN], [b[0], -p / 2 - 0.75 * IN, b[1] + 2 * IN]]); }
      sc.dim([0, -p], [v.L, -p], h.len(v.L));
    },
    'paint-calculator': (v, sc, h) => {
      if (v.mode === 2) { const s = Math.sqrt(Math.max(v.A, 0)); if (sc.box(0, 0, 0, s, 0.1, Math.min(s, 3), COL.paint)) sc.dim([0, 0], [s, 0], h.len(s)); return; }
      if (!(v.L > 0 && v.W > 0 && v.H > 0)) return;
      if (v.mode === 1) houseShell(sc, v, h, { H: v.H, t: 0.15, r: 0.5, over: 0.3, hip: false, doors: v.doors, windows: v.windows });
      else room(sc, v, COL.paint, { len: h.len });
    },
    'tile-calculator': (v, sc, h) => { const s = sc.box(0, 0, 0, v.L, v.W, 0.012, COL.tile); if (s) { s.top.deco = grid(0, 0, v.L, v.W, v.TL, v.TW, 0, 0.012); dims(sc, h, v.L, v.W); } },
    'flooring-calculator': (v, sc, h) => {
      for (const [x, L, W] of [[0, v.L, v.W], [v.L, v.L2, v.W2]]) { const s = sc.box(x, 0, 0, L, W, 0.015, COL.floor); if (s) s.top.deco = grid(x, 0, L, W, 4 * FT, 6 * IN, 0.37, 0.015); }
      dims(sc, h, v.L, v.W);
      if (v.L2 > 0 && v.W2 > 0) sc.dim([v.L, 0], [v.L + v.L2, 0], h.len(v.L2));
    },
    'drywall-calculator': (v, sc, h) => { if (v.L > 0 && v.W > 0 && v.H > 0) room(sc, v, COL.board, { seams: true, len: h.len }); },
    'baseboard-calculator': (v, sc, h) => { if (v.L > 0 && v.W > 0) room(sc, { ...v, H: 8 * FT }, COL.wall, { trim: 0.02, len: h.len }); },
    'insulation-calculator': (v, sc, h) => {
      if (!(v.L > 0 && v.W > 0)) return;
      const th = (v.R / ([3.2, 2.5, 3.6][v.type] || 3.2)) * IN, n = Math.min(Math.ceil(v.L / (16 * IN)), 80);
      sc.box(0, 0, -0.013, v.L, v.W, 0.013, COL.board);
      for (let i = 0; i <= n; i++) sc.box(Math.min(i * 16 * IN, v.L - 1.5 * IN), 0, 0, 1.5 * IN, v.W, 7.25 * IN, COL.wood2);
      sc.box(0, 0, 0, v.L, v.W, th, COL.insul, { layer: 2, alpha: 0.9 });
      dims(sc, h, v.L, v.W);
    },
    'deck-calculator': (v, sc, h) => {
      if (!(v.L > 0 && v.W > 0 && v.BW > 0 && v.JS > 0)) return;
      const z = 0.6, jd = 7.25 * IN, rows = Math.min(Math.ceil(v.W / (v.BW + v.gap) - 1e-9), 160), n = Math.min(Math.ceil(v.L / v.JS - 1e-9) + 1, 120);
      for (const [x, y] of [[0, 0], [v.L - 3.5 * IN, 0], [0, v.W - 3.5 * IN], [v.L - 3.5 * IN, v.W - 3.5 * IN]]) sc.box(x, y, 0, 3.5 * IN, 3.5 * IN, z - jd, COL.post, { layer: 0 });
      for (let i = 0; i < n; i++) sc.box(Math.min(i * v.JS, v.L - 1.5 * IN), 0, z - jd, 1.5 * IN, v.W, jd, COL.wood2, { layer: 0 }); // under the boards, so drawn first
      for (let r = 0; r < rows; r++) {
        const y = r * (v.BW + v.gap), s = sc.box(0, y, z, v.L, Math.min(v.BW, v.W - y), 1 * IN, COL.wood);
        if (s && v.BL > 0) { s.top.deco = []; for (let x = v.BL * (r % 2 ? 0.5 : 1); x < v.L - 1e-6; x += v.BL) s.top.deco.push([[x, y, z + IN], [x, y + v.BW, z + IN]]); }
      }
      dims(sc, h, v.L, v.W);
    },
    'roofing-calculator': (v, sc, h) => {
      const o = 0.3, L = v.L - 2 * o, W = v.W - 2 * o;
      if (!(L > 0.5 && W > 0.5)) return;
      sc.box(0, 0, 0, L, W, 2.6, COL.siding);
      roof(sc, L, W, 2.6, Math.sqrt(v.pitch ** 2 - 1), o, false, COL.siding);
      dims(sc, h, v.L, v.W, -o, -o);
    },
    'stair-calculator': (v, sc, h) => {
      const n = Math.ceil(v.rise / v.max - 1e-9);
      if (!(n > 1 && n < 60 && v.tread > 0)) return;
      const rh = v.rise / n, w = 0.9;
      for (let i = 1; i < n; i++) sc.box(0, (i - 1) * v.tread, 0, w, v.tread, i * rh, COL.wood);
      sc.box(-0.3, (n - 1) * v.tread, v.rise - 0.2, w + 0.6, 1.2, 0.2, COL.slab);
      sc.dim([w, 0], [w, (n - 1) * v.tread], h.len((n - 1) * v.tread));
    },
    'framing-calculator': (v, sc, h) => {
      if (!(v.S > 0 && v.L > 0)) return;
      const Hs = 92.625 * IN, w = 3.5 * IN, th = 1.5 * IN, n = Math.min(Math.ceil(v.L / v.S - 1e-9), 150);
      sc.box(0, 0, 0, v.L, w, th, COL.wood2);
      for (let k = 0; k < (v.plates || 3) - 1; k++) sc.box(0, 0, th + Hs + k * th, v.L, w, th, COL.wood2);
      for (let i = 0; i <= n; i++) sc.box(Math.min(i * v.S, v.L - th), 0, th, th, w, Hs, COL.wood);
      sc.dim([0, 0], [v.L, 0], h.len(v.L));
    },
    'siding-calculator': (v, sc, h) => {
      if (!(v.L > 0.5 && v.W > 0.5 && v.H > 0.5)) return;
      houseShell(sc, v, h, { H: v.H, t: 0.15, r: v.W > 0 ? v.G / (v.W / 2) : 0, over: 0.3, hip: !(v.G > 0), doors: v.doors, windows: v.windows });
    },
    'board-foot-calculator': (v, sc, h) => {
      const n = Math.min(Math.round(v.N), 40);
      if (!(n > 0 && v.T > 0 && v.W > 0 && v.L > 0)) return;
      for (let i = 0; i < n; i++) sc.box((i % 6) * (v.W + 0.01), 0, Math.floor(i / 6) * (v.T + 0.003), v.W, v.L, v.T, COL.wood);
      sc.dim([0, 0], [0, v.L], h.len(v.L), -1);
    },
    // A joint drawn from the calculator's own sizes, with the parts pulled apart so the cuts show.
    'wood-joint-calculator': (v, sc, h) => {
      const T = v.T, W = v.W, j = v.joint, c = h.cut || h.len;
      if (!(T > 0 && W > 0 && W < 200 * T)) return;
      const R = Object.fromEntries(root.MM.CALCS.find(x => x.slug === 'wood-joint-calculator').compute(v, h.sys || 'met')); // the same sizes the visitor sees
      const L = Math.max(3 * W, 6 * T), H = Math.max(1.5 * W, 4 * T), cx = L / 2;
      const outline = (xa, xb, ya, yb, z) => [[[xa, ya, z], [xb, ya, z]], [[xb, ya, z], [xb, yb, z]], [[xb, yb, z], [xa, yb, z]], [[xa, yb, z], [xa, ya, z]]];
      if (j === 10) { // miter: the whole closed frame, each piece pulled out a little from the middle
        const n = Math.min(Math.max(3, Math.round(v.sides) || 4), 12), t = Math.PI / n, ai = (2 * W) / Math.tan(t), g = W * 0.1;
        for (let k = 0; k < n; k++) {
          const th = 2 * t * k, at = (r, a) => [r * Math.cos(a) + g * Math.cos(th), r * Math.sin(a) + g * Math.sin(th)], ri = ai / Math.cos(t), ro = (ai + W) / Math.cos(t);
          sc.prism([at(ri, th - t), at(ro, th - t), at(ro, th + t), at(ri, th + t)], 0, T, k % 2 ? COL.wood2 : COL.wood);
        }
        sc.dim([ai + g, -W], [ai + W + g, -W], c(W));
        // sizes on the front piece: the outside (long point) and inside (short point) lengths, and the saw angle
        const k = Math.round((3 * n) / 4) % n, th = 2 * t * k, e = [Math.cos(th), Math.sin(th)], ri = ai / Math.cos(t), ro = (ai + W) / Math.cos(t);
        const P = (r, a) => [r * Math.cos(a) + g * e[0], r * Math.sin(a) + g * e[1], T];
        sc.dim3(P(ro, th - t), P(ro, th + t), `long point ${c(2 * (ai + W) * Math.tan(t))}`, [e[0] * W * 0.5, e[1] * W * 0.5, 0]);
        sc.dim3(P(ri, th - t), P(ri, th + t), `short point ${c(2 * ai * Math.tan(t))}`, [-e[0] * W * 0.6, -e[1] * W * 0.6, 0]);
        sc.note3([0, 0, T], `saw at ${+(180 / n).toFixed(2)}° each end`);
      } else if (j === 8 || j === 9) { // box joint or dovetail: a corner, with the upright board lifted off
        const g = 1.2 * T;
        sc.box(T, 0, 0, L - T, W, T, COL.wood);
        sc.box(0, 0, T + g, T, W, H, COL.wood2);
        if (j === 8) {
          const n = Math.min(R['Fingers across the joint (both boards)'], 41), f = W / n;
          for (let i = 0; i < n; i++) sc.box(0, i * f, i % 2 ? g : 0, T, f, T, i % 2 ? COL.wood2 : COL.wood);
          sc.dim3([0, 0, T], [0, f, T], `${c(R['Finger width'])} fingers`, [-W * 0.3, 0, 0]);
          sc.dim3([0, 0, 0], [T, 0, 0], `${c(T)} deep`, [0, -W * 0.3, 0]);
        } else {
          // tails on the flat board: wide at its end (x = 0), narrow at the baseline (x = T); pins fill the gaps, half pins at the edges
          const n = Math.min(R.Tails, 20), s = W / n, o = T / 8, tw = Math.max(s - T / 4, 2 * o + 1e-4);
          const pin = (a, b) => sc.prism([[0, a], [T, a ? a - o : 0], [T, b < W ? b + o : W], [0, b]], g, g + T, COL.wood2);
          let prev = 0;
          for (let i = 0; i < n; i++) {
            const a = (i + 0.5) * s - tw / 2, b = a + tw;
            sc.prism([[0, a], [T, a + o], [T, b - o], [0, b]], 0, T, COL.wood);
            pin(prev, a);
            prev = b;
          }
          pin(prev, W);
          sc.dim3([0, 0, 0], [T, 0, 0], `baseline ${c(T)}`, [0, -W * 0.3, 0]);
          if (n > 1) sc.dim3([0, s / 2, T], [0, 1.5 * s, T], `${c(s)} apart`, [-W * 0.3, 0, 0]);
          sc.note3([0.62 * L, 0, T / 2], 'tails 1:8 hardwood · 1:6 softwood');
        }
        sc.dim([0, 0], [0, W], c(W), -1);
        sc.dim3([L, 0, T], [L, W, T], c(W), [W * 0.25, 0, 0]);
      } else if (j === 6) { // half-lap: two boards crossing, each notched half its thickness
        const g = 1.5 * T, a = cx - W / 2, b = cx + W / 2, y0 = W / 2 - L / 2, y1 = W / 2 + L / 2;
        sc.box(0, 0, 0, a, W, T, COL.wood); sc.box(a, 0, 0, W, W, T / 2, COL.wood); sc.box(b, 0, 0, L - b, W, T, COL.wood);
        sc.box(a, y0, g, W, -y0, T, COL.wood2); sc.box(a, 0, g + T / 2, W, W, T / 2, COL.wood2); sc.box(a, W, g, W, y1 - W, T, COL.wood2);
        sc.dim([a, y0], [b, y0], c(W));
        sc.dim3([a, 0, 0], [b, 0, 0], `${c(W)} lap`, [0, 0, -W * 0.3]);
        sc.dim3([b, 0, T / 2], [b, 0, T], `${c(T / 2)} deep`, [W * 0.35, 0, 0]);
      } else if (j === 0 || j === 4 || j === 5) { // butt, dado, rabbet: a shelf standing on a flat board
        const gx = j === 5 ? 0 : cx - T / 2, dd = j === 4 ? T / 3 : j === 5 ? T / 2 : 0, g = 1.2 * T;
        if (gx > 0) sc.box(0, 0, 0, gx, W, T, COL.wood);
        sc.box(gx, 0, 0, T, W, T - dd, COL.wood);
        sc.box(gx + T, 0, 0, L - gx - T, W, T, COL.wood);
        sc.box(gx, 0, T - dd + g, T, W, H, COL.wood2);
        if (j === 0) { // screws up through the bottom board into the shelf's end
          const n = R['Screws per joint'];
          for (let i = 0; i < n; i++) sc.cyl(gx + T / 2, (W * (i + 0.5)) / n, T / 14, -g, -g + R['Screw length'], COL.steel, {}, 10);
        }
        sc.dim([gx + T, 0], [gx + T, W], c(W));
        const top = T - dd + g + H;
        sc.dim3([gx, 0, top], [gx + T, 0, top], c(T), [0, 0, W * 0.2]);
        sc.dim3([gx + T, 0, top], [gx + T, W, top], c(W), [W * 0.2, 0, 0]);
        if (dd) {
          sc.dim3([gx, 0, T], [gx + T, 0, T], `${c(T)} wide`, [0, -W * 0.3, 0]);
          sc.dim3([gx + T, 0, T - dd], [gx + T, 0, T], `${c(dd)} deep`, [W * 0.4, 0, 0]);
        } else sc.note3([gx + T / 2, W / 2, -g - T], `${c(R['Screw length'])} screws`);
      } else { // pocket screw, dowel, biscuit, mortise and tenon: a T joint, the bottom board on edge and the upright's end coming down onto it
        const t = j === 7 ? R['Tenon length (⅔ of the board width)'] : j === 2 ? 2 * R['Dowel diameter'] : 0.012, g = t + W * 0.25, x0 = cx - W / 2;
        const A = sc.box(0, 0, 0, L, T, W, COL.wood), B = sc.box(x0, 0, W + g, W, T, H, COL.wood2);
        A.top.deco = [];
        if (j === 7) {
          const tt = R['Tenon thickness'], tw = R['Tenon width'];
          sc.box(cx - tw / 2, (T - tt) / 2, W + g - t, tw, tt, t, COL.wood2);
          A.top.deco = outline(cx - tw / 2, cx + tw / 2, (T - tt) / 2, (T + tt) / 2, W);
          const ox = T / 3 + W * 0.3, md = R['Mortise depth'];
          sc.dim3([cx + tw / 2, (T - tt) / 2, W + g - t], [cx + tw / 2, (T - tt) / 2, W + g], `${c(t)} long`, [ox, 0, 0]);
          sc.note3([cx, (T - tt) / 2, W + g - t / 2], `tenon ${c(tt)} thick`);
          sc.dim3([cx - tw / 2, 0, W - md], [cx - tw / 2, 0, W], `mortise ${c(md)}`, [-ox, 0, 0]);
        } else if (j === 2) {
          const d = R['Dowel diameter'], n = Math.min(R['Dowels per joint'], 40), sp = R['Dowel spacing (center to center)'];
          for (let i = 0; i < n; i++) {
            const x = x0 + T / 2 + i * sp;
            sc.cyl(x, T / 2, d / 2, W + g - t, W + g, COL.floor, {}, 14);
            for (let k = 0; k < 12; k++) { const p = a => [x + (d / 2) * Math.cos(a), T / 2 + (d / 2) * Math.sin(a), W]; A.top.deco.push([p((k * Math.PI) / 6), p(((k + 1) * Math.PI) / 6)]); }
          }
          if (n > 1) sc.dim3([x0 + T / 2, 0, W], [x0 + T / 2 + sp, 0, W], `${c(sp)} apart`, [0, 0, -W * 0.3]);
          sc.note3([x0 + W * 1.35, 0, W + g - t / 2], `Ø ${c(d)} × ${c(R['Dowel length'])} dowels`);
        } else if (j === 3) { // biscuits: #0 47 × 15 mm, #10 53 × 19 mm, #20 56 × 23 mm
          const n = Math.min(R['Biscuits per joint'], 20), [bl, bw] = { 0: [0.047, 0.015], 10: [0.053, 0.019], 20: [0.056, 0.023] }[R['Biscuit size (#0, #10 or #20)']];
          for (let i = 0; i < n; i++) {
            const x = x0 + (W * (i + 0.5)) / n;
            sc.box(x - bl / 2, T / 2 - 0.002, W + g - bw / 2, bl, 0.004, bw / 2, COL.floor);
            A.top.deco.push(...outline(x - bl / 2 - 0.002, x + bl / 2 + 0.002, T / 2 - 0.002, T / 2 + 0.002, W));
          }
          sc.note3([x0 + W * 1.4, 0, W + g / 2], `#${R['Biscuit size (#0, #10 or #20)']} biscuit, slot ${c(T / 2)} from the face`);
        } else { // pocket screw: the angled holes show as slots on the upright's face
          const n = R['Screws per joint'], r = T / 4, z0 = W + g + 0.3 * T, z1 = z0 + 1.6 * T;
          B.sides[0].deco = [];
          for (let i = 0; i < n; i++) {
            const x = x0 + (W * (i + 0.5)) / n;
            B.sides[0].deco.push([[x - r, 0, z0], [x + r, 0, z0]], [[x + r, 0, z0], [x + r, 0, z1]], [[x + r, 0, z1], [x - r, 0, z1]], [[x - r, 0, z1], [x - r, 0, z0]]);
          }
          sc.note3([cx, 0, z1 + T], `${c(R['Pocket screw length'])} pocket screws`);
        }
        sc.dim([x0, 0], [x0 + W, 0], c(W));
        const top = W + g + H;
        sc.dim3([x0, 0, top], [x0 + W, 0, top], c(W), [0, 0, W * 0.2]);
        sc.dim3([x0 + W, 0, top], [x0 + W, T, top], c(T), [W * 0.2, 0, 0]);
      }
    },
    // Each board as it will be cut: pieces in two shades, the saw kerf as a gap, the trim and the offcut pale.
    'cut-list-calculator': (v, sc, h) => {
      if (!(v.SL > 0)) return;
      const p = root.MM.cutPlan(v), bw = 3.5 * IN, th = 0.75 * IN, gap = Math.max(4 * IN, v.SL / 10), c = h.cut || h.len;
      p.boards.slice(0, 12).forEach((b, i) => {
        const y = i * (bw + gap);
        let x = v.trim;
        if (v.trim > 0) sc.box(0, y, 0, v.trim, bw, th, COL.board);
        b.cuts.forEach((len, k) => {
          sc.box(x, y, 0, len, bw, th, k % 2 ? COL.wood2 : COL.wood);
          sc.text([x + len / 2, y + bw / 2], c(len));
          sc.dim3([x, y, th], [x + len, y, th], c(len), [0, -gap * 0.4, 0]);
          x += len + v.kerf;
        });
        if (b.left > 1e-4) { sc.box(v.SL - b.left, y, 0, b.left, bw, th, COL.board); sc.note3([v.SL - b.left / 2, y + bw / 2, th], 'offcut'); }
      });
      if (p.boards.length) {
        sc.dim([0, 0], [v.SL, 0], h.len(v.SL));
        const yb = (Math.min(p.boards.length, 12) - 1) * (bw + gap) + bw;
        sc.dim3([0, yb, th], [v.SL, yb, th], `board ${h.len(v.SL)}`, [0, gap * 0.4, 0]);
      }
    },
    'square-footage-calculator': (v, sc, h) => {
      const z = 0.05;
      if (v.shape === 2) { if (sc.cyl(v.D / 2, v.D / 2, v.D / 2, 0, z, COL.floor)) sc.dim([0, 0], [v.D, 0], 'Ø ' + h.len(v.D)); }
      else if (v.shape === 3) { if (v.B > 0 && v.TH > 0 && sc.prism([[0, 0], [v.B, 0], [v.B / 2, v.TH]], 0, z, COL.floor)) { sc.dim([0, 0], [v.B, 0], h.len(v.B)); sc.dim([v.B / 2, 0], [v.B / 2, v.TH], h.len(v.TH), -1); } }
      else {
        const s = sc.box(0, 0, 0, v.L, v.W, z, COL.floor);
        if (s) s.top.deco = grid(0, 0, v.L, v.W, FT, FT, 0, z);
        if (v.shape === 1) { const s2 = sc.box(v.L, 0, 0, v.L2, v.W2, z, COL.floor); if (s2) { s2.top.deco = grid(v.L, 0, v.L2, v.W2, FT, FT, 0, z); sc.dim([v.L, 0], [v.L + v.L2, 0], h.len(v.L2)); } }
        dims(sc, h, v.L, v.W);
      }
    },
  };

  // For the floor plan editor (house-plan.js): the sample plan, the wall geometry it snaps to, and the counts for the estimate.
  const house = {
    sample: v => samplePlan(v.L, v.W, houseT(v), { stories: v.stories || 1, doors: v.doors, gdoors: v.gdoors, windows: v.windows, layout: true, I: v.I, idoors: v.idoors,
      name: v.gdoors ? 'Garage' : v.L * v.W < 20 ? 'Storage' : 'Open plan' }),
    ext: v => extWalls(v.L, v.W, houseT(v)), inside: (v, fl) => insideWalls(fl, v.L, v.W, houseT(v)), fit: fitItems,
    counts: (v, plan) => planCounts(v, plan, v.stories || 1), t: houseT, TI, WIDTH, BAND,
  };
  root.MMViews = { views, Scene, render3d, renderPlan, house };
  if (typeof module === 'object') module.exports = root.MMViews;
})(typeof window !== 'undefined' ? window : globalThis);
