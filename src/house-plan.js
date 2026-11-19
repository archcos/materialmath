// Floor plan editor for the House Material Calculator: visitors draw their own inside walls, doors, windows and
// room names on the Plan view, story by story, and the estimate counts what they drew.
// calc-ui.js calls MMEditors[slug](api) and uses what it returns; the plan data format is described in views.js.
(function () {
  const KEY = 'mm-house-plan';
  const COUNTED = ['I', 'doors', 'gdoors', 'idoors', 'windows']; // the fields the plan fills in
  const TOOLS = [
    ['wall', 'Wall', 'Drag to draw an inside wall. It snaps to the grid and to other walls.'],
    ['door', 'Door', 'Click a wall to add a door: an outside door on an outside wall, an inside door on an inside wall.'],
    ['window', 'Window', 'Click an outside wall to add a window.'],
    ['garage', 'Garage door', 'Click a ground-floor outside wall to add a 16 ft garage door.'],
    ['room', 'Room name', 'Click inside a room to name it. Click a name to change it.'],
    ['erase', 'Erase', 'Click a wall, door, window or room name to remove it.'],
  ];

  (window.MMEditors = window.MMEditors || {})['house-material-calculator'] = api => {
    const H = MMViews.house, el = api.el;
    let plan = null, floor = 0, tool = 'wall', drag = null, hover = null, msg = '';
    const undo = [];
    try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && Array.isArray(s.floors)) plan = s; } catch (e) {}

    // Toolbar above the drawing, shown on the Plan tab.
    const bar = document.createElement('div');
    bar.className = 'ptools';
    api.fig.querySelector('.vbox').before(bar);

    // Saved with the building size and stories, so the walls come back on the same house.
    const save = () => {
      const V = v();
      if (plan && V) plan.size = { L: V.L, W: V.W, stories: V.stories || 1 };
      try { if (plan) localStorage.setItem(KEY, JSON.stringify(plan)); else localStorage.removeItem(KEY); } catch (e) {}
    };
    const changed = () => { save(); paintBar(); api.update(); };
    const remember = () => { undo.push(JSON.stringify(plan)); if (undo.length > 60) undo.shift(); };
    let curV = null; // the values being worked out right now (api.values() is the last good set)
    const v = () => curV || api.values();
    const stories = () => (v() && v().stories) || 1;
    // Make sure every story has a plan: a new upper floor starts from the sample.
    function fill() {
      if (!plan || !v()) return;
      const sample = H.sample(v());
      for (let f = plan.floors.length; f < stories(); f++) plan.floors.push(sample.floors[f]);
    }
    function paintBar() {
      const st = stories(), fl = Math.min(floor, st - 1), cap = api.fig.querySelector('figcaption');
      if (!bar.hidden && cap) cap.textContent = plan ? 'Plan view · your layout: draw on it, Shift-drag or two fingers to move' : 'Plan view · scroll or pinch to zoom, drag to move';
      const floors = st > 1 ? `<span class="pt-group" role="group" aria-label="Story">${['Ground floor', 'Upper floor'].map((n, f) =>
        `<button type="button" data-floor="${f}" aria-pressed="${f === fl}">${n}</button>`).join('')}</span>` : '';
      if (!plan) {
        bar.innerHTML = `${floors}<button type="button" class="pt-main" data-act="start">Draw my own layout</button>
          <span class="pt-msg">Start from this sample and change the walls, doors, windows and room names. The estimate follows your drawing.</span>`;
        return;
      }
      const tip = (TOOLS.find(t => t[0] === tool) || TOOLS[0])[2];
      bar.innerHTML = `${floors}<span class="pt-group" role="group" aria-label="Drawing tool">${TOOLS.map(([k, n]) =>
        `<button type="button" data-tool="${k}" aria-pressed="${k === tool}"${k === 'garage' && fl ? ' disabled' : ''}>${n}</button>`).join('')}</span>
        <span class="pt-group"><button type="button" data-act="undo"${undo.length ? '' : ' disabled'}>Undo</button><button type="button" data-act="clear">Clear this floor</button><button type="button" data-act="sample">Back to the sample</button></span>
        <span class="pt-msg" aria-live="polite">${msg || tip}</span>`;
    }
    bar.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b || b.disabled) return;
      msg = '';
      if (b.dataset.floor) { floor = +b.dataset.floor; paintBar(); api.redraw(); return; }
      if (b.dataset.tool) { tool = b.dataset.tool; paintBar(); return; }
      const act = b.dataset.act;
      if (act === 'start') { plan = JSON.parse(JSON.stringify(H.sample(v()))); undo.length = 0; tool = 'wall'; }
      else if (act === 'undo') { if (undo.length) plan = JSON.parse(undo.pop()); }
      else if (act === 'clear') { remember(); plan.floors[Math.min(floor, stories() - 1)] = { ext: [[], [], [], []], walls: [], rooms: [] }; }
      else if (act === 'sample') {
        if (!confirm('Go back to the sample layout? Your drawing will be removed.')) return;
        plan = null; undo.length = 0;
      }
      changed();
    });

    // ---- Geometry: pointer to metres on the ground, and the walls near a point.
    let svg = null, xf = null;
    function toWorld(e) {
      if (!svg || !xf) return null;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const q = pt.matrixTransform(svg.getScreenCTM().inverse());
      return [xf.x0 + (q.x - xf.ox) / xf.k, xf.y0 + (300 - xf.oy - q.y) / xf.k];
    }
    const toSvg = ([x, y]) => [xf.ox + (x - xf.x0) * xf.k, 300 - xf.oy - (y - xf.y0) * xf.k];
    const px = n => (n * (svg.viewBox.baseVal.width / (svg.getBoundingClientRect().width || 400))) / xf.k; // n screen pixels in metres
    const grid = () => (api.sys() === 'imp' ? 0.1524 : 0.1); // 6 in or 10 cm
    const curFloor = () => plan.floors[Math.min(floor, stories() - 1)];
    // Every wall as { kind: 'ext' | 'in', ax: 0 (along x) | 1, p (centre line), a..b (run), items, list (the data to add to) }.
    function walls() {
      const V = v(), t = H.t(V), fl = curFloor(), out = [];
      H.ext(V).forEach((w, n) => {
        const ax = w.ax === 'x' ? 0 : 1;
        out.push({ kind: 'ext', n, ax, p: (ax ? w.x : w.y) + t / 2, a: w.s, b: w.s + w.len, s: w.s, len: w.len, list: fl.ext[n] || (fl.ext[n] = []) });
      });
      for (const q of H.inside(V, fl)) out.push({ kind: 'in', ax: q.ax, p: q.p, a: q.a, b: q.b, s: q.a, len: q.len, data: q.w, list: q.w.items || (q.w.items = []) });
      return out;
    }
    const along = (w, P) => P[w.ax];
    const dist = (w, P) => { const u = along(w, P), d = Math.abs(P[1 - w.ax] - w.p); return u < w.a ? Math.hypot(w.a - u, d) : u > w.b ? Math.hypot(u - w.b, d) : d; };
    function nearestWall(P, tol) {
      let best = null, bd = tol;
      for (const w of walls()) { const d = dist(w, P); if (d < bd) { bd = d; best = w; } }
      return best;
    }
    // Snap a point: to the inside faces of the outside walls and to inside wall centre lines when close, else to the grid.
    function snap(P) {
      const V = v(), t = H.t(V), tol = Math.max(0.15, px(10)), g = grid();
      const lines = [[t, V.L - t], [t, V.W - t]];
      const fl = Math.min(floor, stories() - 1);
      for (const q of H.inside(V, curFloor())) lines[1 - q.ax].push(q.p);
      if (fl) for (const q of H.inside(V, plan.floors[fl - 1] || {})) lines[1 - q.ax].push(q.p); // line up with the walls below
      return P.map((c, i) => {
        const near = lines[i].reduce((b, x) => (Math.abs(x - c) < Math.abs(b - c) ? x : b), Infinity);
        return Math.abs(near - c) < tol ? near : Math.round(c / g) * g;
      }).map((c, i) => Math.min(Math.max(c, t), (i ? V.W : V.L) - t));
    }
    // The wall being drawn: from its start, along whichever axis the pointer moved further.
    function wallFrom(a, b) {
      const ax = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]) ? 0 : 1;
      return ax ? [a, [a[0], b[1]]] : [a, [b[0], a[1]]];
    }

    // ---- Actions
    function place(kind, P) {
      const fl = Math.min(floor, stories() - 1), w = nearestWall(P, Math.max(0.5, px(14)));
      if (!w) return 'Click on a wall.';
      if ((kind === 'window' || kind === 'garage') && w.kind !== 'ext') return kind === 'window' ? 'Windows go on outside walls.' : 'Garage doors go on outside walls.';
      if (kind === 'garage' && fl) return 'Garage doors go on the ground floor.';
      const width = kind === 'door' ? (w.kind === 'ext' ? H.WIDTH.door : H.WIDTH.idoor) : H.WIDTH[kind];
      if (width > w.len - 0.1) return 'That wall is too short for it.';
      const g = grid(), c = Math.min(Math.max(Math.round(along(w, P) / g) * g, w.a + width / 2 + 0.03), w.b - width / 2 - 0.03);
      const item = { kind, c: Math.round(c * 1000) / 1000, w: width };
      if (H.fit([...w.list, item], w.s, w.len).length <= H.fit(w.list, w.s, w.len).length) return 'No room there: it would overlap a door or window.';
      remember();
      w.list.push(item);
      return '';
    }
    // What is under the pointer, for Erase: an opening, then a room name, then an inside wall.
    function pick(P) {
      const tol = Math.max(0.3, px(10)), fl = curFloor();
      for (const w of walls()) for (const it of H.fit(w.list, w.s, w.len)) {
        if (Math.abs(P[1 - w.ax] - w.p) < tol + 0.1 && Math.abs(along(w, P) - it.c) < it.w / 2 + 0.05) return { w, it: w.list.find(x => x.c === it.c && x.kind === it.kind) };
      }
      const r = fl.rooms.find(r => Math.hypot(r.at[0] - P[0], r.at[1] - P[1]) < Math.max(0.6, px(16)));
      if (r) return { r };
      const w = nearestWall(P, tol);
      return w && w.kind === 'in' ? { wall: w } : null;
    }
    function erase(P) {
      const hit = pick(P), fl = curFloor();
      if (!hit) return 'Nothing to erase there. Outside walls stay: change the building size instead.';
      remember();
      if (hit.it) hit.w.list.splice(hit.w.list.indexOf(hit.it), 1);
      else if (hit.r) fl.rooms.splice(fl.rooms.indexOf(hit.r), 1);
      else fl.walls.splice(fl.walls.indexOf(hit.wall.data), 1);
      return '';
    }
    function name(P) {
      const fl = curFloor(), r = fl.rooms.find(r => Math.hypot(r.at[0] - P[0], r.at[1] - P[1]) < Math.max(0.6, px(16)));
      const n = prompt(r ? 'Room name (leave empty to remove it)' : 'Room name', r ? r.name : 'Bedroom');
      if (n === null) return '';
      remember();
      const text = n.trim().slice(0, 30);
      if (r) { if (text) r.name = text; else fl.rooms.splice(fl.rooms.indexOf(r), 1); }
      else if (text) fl.rooms.push({ at: P.map(x => Math.round(x * 100) / 100), name: text });
      return '';
    }

    return {
      // Called by update() before the estimate: the plan's counts replace those fields.
      apply(V) {
        const on = !!plan, st = (curV && curV.stories) || 0;
        curV = V;
        if (on && (!plan.size || plan.size.L !== V.L || plan.size.W !== V.W || plan.size.stories !== (V.stories || 1))) save();
        if ((V.stories || 1) !== st) paintBar(); // the story buttons follow the Stories menu
        for (const id of COUNTED) {
          const box = api.field(id), field = box.closest('.field');
          box.readOnly = on;
          if (api.field(id + '-in')) api.field(id + '-in').readOnly = on;
          field.classList.toggle('from-plan', on);
        }
        if (!on) return;
        fill();
        const per = H.counts(V, plan), sum = k => per.reduce((s, c) => s + c[k], 0);
        V.plan = per;
        for (const id of COUNTED) { V[id] = sum(id); api.write(id, id === 'I' ? 'len' : 'count', V[id]); }
      },
      view: () => ({ plan, floor }),
      // After the plan view is drawn: grid, the wall being drawn, and the tool's highlight.
      drawn(s, sc) {
        svg = s; xf = sc.xf;
        s.parentNode.classList.toggle('editing', !!plan); // a finger draws instead of scrolling the page
        if (!plan || !xf) return;
        const V = v(), t = H.t(V), g = grid() * (api.sys() === 'imp' ? 2 : 5), [a0, a1] = toSvg([t, t]), [b0, b1] = toSvg([V.L - t, V.W - t]);
        let o = '<g class="pe" pointer-events="none">';
        let d = '';
        for (let x = Math.ceil(t / g) * g; x < V.L - t; x += g) { const X = toSvg([x, 0])[0]; d += `M${X.toFixed(1)} ${b1.toFixed(1)}V${a1.toFixed(1)}`; }
        for (let y = Math.ceil(t / g) * g; y < V.W - t; y += g) { const Y = toSvg([0, y])[1]; d += `M${a0.toFixed(1)} ${Y.toFixed(1)}H${b0.toFixed(1)}`; }
        o += `<path class="pe-grid" d="${d}"/>`;
        if (drag && drag.tool === 'wall' && drag.to) {
          const [A, B] = wallFrom(drag.from, drag.to).map(toSvg), len = Math.hypot(drag.to[0] - drag.from[0], drag.to[1] - drag.from[1]);
          const [p, q] = wallFrom(drag.from, drag.to);
          o += `<line class="pe-wall" x1="${A[0].toFixed(1)}" y1="${A[1].toFixed(1)}" x2="${B[0].toFixed(1)}" y2="${B[1].toFixed(1)}"/>`;
          if (len > 0.05) o += `<text class="pe-len" x="${((A[0] + B[0]) / 2).toFixed(1)}" y="${((A[1] + B[1]) / 2 - 8).toFixed(1)}" text-anchor="middle">${api.fmt(Math.hypot(q[0] - p[0], q[1] - p[1]), 'len')}</text>`;
        }
        if (hover) { const [X, Y] = toSvg(hover); o += `<circle class="pe-dot" cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="3"/>`; }
        s.insertAdjacentHTML('beforeend', o + '</g>');
      },
      // Pointer on the Plan tab. Returns true when the editor uses it (else the drawing pans).
      down(e) {
        if (!plan || !xf) return false;
        const P = toWorld(e);
        if (!P) return false;
        drag = { tool, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY], moved: false, from: tool === 'wall' ? snap(P) : P };
        return true;
      },
      move(e) {
        if (!drag) { // mouse hover: show where a wall would start
          if (plan && tool === 'wall' && e.pointerType === 'mouse') { const P = toWorld(e); hover = P && snap(P); api.redraw(); }
          return;
        }
        if (Math.hypot(e.clientX - drag.start[0], e.clientY - drag.start[1]) > 6) drag.moved = true;
        if (drag.tool === 'wall') { const P = toWorld(e); if (P) { drag.to = snap(P); hover = drag.to; } api.redraw(); }
        else if (drag.moved) { api.pan(e.clientX - drag.last[0], e.clientY - drag.last[1]); } // click tools: dragging moves the drawing
        drag.last = [e.clientX, e.clientY];
      },
      up(e) {
        const d = drag;
        drag = null;
        if (!d) return;
        const P = toWorld(e);
        msg = '';
        if (d.tool === 'wall') {
          if (d.to) {
            const [a, b] = wallFrom(d.from, d.to);
            if (Math.hypot(b[0] - a[0], b[1] - a[1]) >= 0.3) { remember(); curFloor().walls.push({ a, b, items: [] }); }
            else msg = 'Drag further to draw a wall.';
          } else msg = 'Drag from one point to another to draw a wall.';
        } else if (!d.moved && P) {
          msg = d.tool === 'erase' ? erase(P) : d.tool === 'room' ? name(P) : place(d.tool, P);
        }
        if (d.tool === 'wall' || !d.moved) changed();
      },
      cancel() { drag = null; hover = null; api.redraw(); },
      leave() { if (hover) { hover = null; api.redraw(); } },
      key(e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && plan && undo.length) { e.preventDefault(); plan = JSON.parse(undo.pop()); changed(); return true; }
        if (e.key === 'Escape' && drag) { this.cancel(); return true; }
        return false;
      },
      tab(t) { bar.hidden = t !== 'plan'; if (!bar.hidden) paintBar(); },
      // On page load: a saved drawing brings back its building size and stories.
      start() {
        const z = plan && plan.size;
        if (!z) return;
        api.write('L', 'len', z.L);
        api.write('W', 'len', z.W);
        api.field('stories').value = z.stories;
      },
      // A sample build was picked: it replaces a drawn layout (after asking). A ?sample= link never replaces one.
      preset(auto) {
        if (!plan) return true;
        if (auto) return false;
        if (!confirm('Use this sample? Your own layout will be replaced by the sample layout.')) return false;
        plan = null; undo.length = 0; save(); paintBar();
        return true;
      },
      refresh: paintBar,
    };
  };
})();
