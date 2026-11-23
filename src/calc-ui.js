// Renders the calculator for <div id="calc" data-slug="..."> using the definitions in formulas.js.
(function () {
  const el = document.getElementById('calc');
  if (!el) return;
  const C = MM.CALCS.find(c => c.slug === el.dataset.slug);
  const U = MM.UNITS, FT = U.len[0][1], IN = U.small[0][1];
  const hints = C.hints || {};
  let sys = MMLocale.sys(), cur = MMLocale.currency(), rows = null; // from site.js, which loads first (all three are deferred)

  const i = () => (sys === 'imp' ? 0 : 1);
  const unit = k => (U[k] ? U[k][i()][0] : k === 'pct' ? '%' : '');
  const fromBase = (k, b) => (U[k] ? b / U[k][i()][1] : k === 'pct' ? b * 100 : b);
  const round = x => Math.round(x * 1000) / 1000; // 3 decimals keeps ⅛ in (0.125) exact
  const num = s => (s.trim() === '' ? NaN : Number(s));
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const f = id => document.getElementById('f-' + id);
  // Units each measurement box can be typed in, per system: [label, metres per unit, has a second box for inches].
  // Each box only offers its system's units (never mixed); the first one is the usual unit.
  const INPUT_UNITS = {
    len: { imp: [['ft', FT, true], ['in', IN], ['yd', 3 * FT]], met: [['m', 1], ['cm', 0.01], ['mm', 0.001]] },
    small: { imp: [['in', IN], ['ft', FT]], met: [['cm', 0.01], ['mm', 0.001], ['m', 1]] },
  };
  const fu = {}; // unit picked per box; missing = the system's usual unit
  const opt = (id, k) => INPUT_UNITS[k] && (INPUT_UNITS[k][sys].find(u => u[0] === fu[id]) || INPUT_UNITS[k][sys][0]);
  const ftIn = (id, k) => !!(opt(id, k) || [])[2]; // feet boxes get a second box for inches
  // C.show = { inputId: [selectId, [option values that show it]] }: a field only some choices need (Shape: Round shows Diameter).
  // Hidden fields count as 0 and are left out of the copied text and the project.
  const visible = id => !(C.show && C.show[id]) || C.show[id][1].includes(Number(f(C.show[id][0]).value));
  const shownInputs = () => C.inputs.filter(([id]) => visible(id));

  // The "?" shows the tip on hover, tap or keyboard focus; the input is also described by it for screen readers.
  const field = ([id, label, kind, def, opts]) => `<div class="field"><div class="lab"><label for="f-${id}">${label}</label>${
    C.tips[id] ? `<button type="button" class="tip" aria-label="Tip: ${label}">?</button><span class="tooltip" role="tooltip" id="t-${id}">${C.tips[id]}</span>` : ''
  }</div><div class="inp">${
    kind === 'select'
      ? `<select id="f-${id}" aria-describedby="t-${id}">${opts.map((o, n) => `<option value="${o[1]}"${n === def ? ' selected' : ''}>${o[0]}</option>`).join('')}</select>`
      : `<input id="f-${id}" type="number" inputmode="decimal" min="0" step="any" aria-describedby="t-${id}">`
  }${INPUT_UNITS[kind]
    ? `<select class="unit-sel" data-id="${id}" aria-label="Unit for ${label}"></select>` // options filled per system in paintUnits()
    : `<span class="unit" data-kind="${kind}"></span>`}${
    kind === 'len' ? `<input id="f-${id}-in" class="in-box" type="number" inputmode="decimal" min="0" step="any" placeholder="0" aria-label="${label}, inches"><span class="unit-in in-box">in</span>` : ''
  }</div>${hints[id] ? `<p class="help">${hints[id]}</p>` : ''}</div>`;

  el.innerHTML = `${C.presets ? `<div class="presets" role="group" aria-label="Sample builds"><span>Start from a sample:</span>${
      C.presets.map(([name], n) => `<button type="button" data-preset="${n}" aria-pressed="false">${name}</button>`).join('')}</div>` : ''}
    <div class="units" role="group" aria-label="Units">
      <button type="button" data-sys="imp">Imperial (ft, in)</button><button type="button" data-sys="met">Metric (m, cm)</button></div>
    <form class="fields" onsubmit="return false">${C.inputs.map(field).join('')}</form>
    <h2 class="res-title">You need</h2>
    <div class="headline" aria-live="polite"></div>
    <div class="results"></div>
    ${C.prices ? `<div class="cost"><div class="cost-head"><h2 class="res-title">Cost estimate</h2>
    <div class="cur"><label for="cur-in">Currency</label><div class="cur-box">
      <input id="cur-in" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="cur-opts" autocomplete="off" spellcheck="false" placeholder="Search: peso, yen, GBP…">
      <ul id="cur-opts" class="cur-opts" role="listbox" aria-label="Currencies" hidden></ul></div></div></div>
    <div class="cost-list"><table class="costs"></table></div>
    <p class="total" aria-live="polite"></p>
    <p class="help cost-help"></p></div>` : ''}
    <div class="actions"><button type="button" class="btn add" data-tip="Saves this calculation to your project, so several jobs (like a slab, its gravel base and a fence) add up to one shopping list and total.">+ Add to project</button><button type="button" class="copy" data-tip="Copies your measurements, results${C.prices ? ' and cost estimate' : ''} as text, ready to paste into a text message, email or notes.">Copy results</button>${
      C.prices
        ? '<button type="button" class="btn alt" data-print="all" data-tip="Prints your measurements, quantities and cost estimate on one page, with boxes to tick off at the store.">Print shopping list</button><button type="button" class="btn alt" data-print="qty" data-tip="The same printout without the prices and total. Handy for giving to a supplier or helper.">Print without prices</button>'
        : '<button type="button" class="btn alt" data-print="all" data-tip="Prints your measurements and results on one page.">Print results</button>'}</div>
    <p class="added" aria-live="polite"></p>`;
  const head = el.querySelector('.headline'), out = el.querySelector('.results'), copy = el.querySelector('.copy'), add = el.querySelector('.add');
  const costTable = el.querySelector('.costs'), totalEl = el.querySelector('.total');
  // "Print without prices" adds a class that the print stylesheet uses to hide the cost estimate.
  el.querySelectorAll('[data-print]').forEach(b => b.addEventListener('click', () => {
    document.body.classList.toggle('print-no-cost', b.dataset.print === 'qty');
    window.print();
  }));
  addEventListener('afterprint', () => document.body.classList.remove('print-no-cost')); // so a later Ctrl+P prints prices again

  // "Add to project" saves a snapshot of this calculation; the /project/ page (project.js) adds them all up.
  // shortcut: a snapshot, not a live link; to change an item, remove it and add it again. Upgrade if visitors ask to edit in place.
  add.addEventListener('click', () => {
    if (!rows) return;
    const { lines } = updateCosts();
    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      slug: C.slug, title: C.title,
      inputs: shownInputs().map(([id, label, k]) => [label, shown(id, k)]),
      rows: rows.map(([l, b, k]) => [l, fmt(b, k)]),
      costs: lines.map(([label, qtyText, price, cost, k]) => {
        const b = rows.find(r => r[0] === label)[1];
        return { label, qtyText, qty: k === 'count' ? b : fromBase(k, b), unit: k === 'count' ? '' : unit(k), price, cost };
      }),
      currency: cur,
    };
    const list = MMProject.get();
    list.push(item);
    MMProject.save(list);
    el.querySelector('.added').innerHTML = `Added. Your project has ${list.length} item${list.length > 1 ? 's' : ''}. <a href="/project/">View project and total →</a>`;
  });

  // ---- Cost estimate: one row per priced result row; prices are remembered per calculator, currency, unit system and item.
  // Default prices are US store prices, so they only fill in for US dollars; other currencies start blank.
  const money = x => MMLocale.money(x, cur);
  const priceKey = l => `mm-price:${C.slug}:${cur}:${sys}:${l}`;
  // Searchable currency dropdown (our own list, because the browser's <datalist> doesn't open in every browser).
  // Click or tap shows every currency; typing filters by code, name or symbol; arrows + Enter or a click picks one.
  const curBox = el.querySelector('#cur-in'), curList = el.querySelector('#cur-opts');
  if (curBox) {
    let matches = [], active = -1;
    const paintActive = () => curList.querySelectorAll('[data-cur]').forEach((li, n) => {
      li.setAttribute('aria-selected', n === active);
      if (n === active) { curBox.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
    });
    const showCur = () => {
      const t = curBox.value.trim().toLowerCase(), all = !t || curBox.value === MMLocale.label(cur);
      matches = MMLocale.currencies.filter(c => all || MMLocale.label(c).toLowerCase().includes(t));
      active = all ? matches.indexOf(cur) : matches.length ? 0 : -1;
      curList.innerHTML = matches.map(c => `<li role="option" id="co-${c}" data-cur="${c}">${esc(MMLocale.label(c))}</li>`).join('')
        || '<li class="none">No currency found</li>';
      curList.hidden = false;
      curBox.setAttribute('aria-expanded', 'true');
      paintActive();
    };
    const hideCur = () => {
      curList.hidden = true;
      curBox.setAttribute('aria-expanded', 'false');
      curBox.removeAttribute('aria-activedescendant');
      curBox.value = MMLocale.label(cur); // an unfinished search snaps back to the current currency
    };
    const pickCur = c => {
      if (c && c !== cur) { cur = c; MMLocale.setCurrency(c); buildCosts(); update(); }
      hideCur();
    };
    curBox.value = MMLocale.label(cur);
    curBox.addEventListener('focus', () => { curBox.select(); showCur(); }); // typing replaces the old choice
    curBox.addEventListener('click', () => { if (curList.hidden) showCur(); });
    curBox.addEventListener('input', showCur);
    curBox.addEventListener('blur', hideCur);
    curBox.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (curList.hidden) showCur();
        if (matches.length) { active = (active + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length; paintActive(); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        pickCur(matches[active] || MMLocale.parse(curBox.value));
      } else if (e.key === 'Escape') hideCur();
    });
    // mousedown (not click) with preventDefault keeps focus in the box, so blur doesn't close the list before the pick
    curList.addEventListener('mousedown', e => {
      e.preventDefault();
      const li = e.target.closest('[data-cur]');
      if (li) pickCur(li.dataset.cur);
    });
  }
  let priced = []; // [label, kind, per-text] for the current unit system

  function buildCosts() {
    if (!C.prices) return;
    // Any valid input gives the row labels for this unit system. Some rows only appear for one menu choice
    // (2×6 studs, upper-floor joists), so each menu option is tried too and every priced row gets a line.
    const ones = Object.fromEntries(C.inputs.map(([id]) => [id, 1]));
    const tries = [ones, ...C.inputs.filter(i => i[2] === 'select').flatMap(([id, , , , opts]) => opts.map(o => ({ ...ones, [id]: o[1] })))];
    const seen = new Set();
    priced = tries.flatMap(v => C.compute(v, sys)).filter(([l]) => C.prices[l] && !seen.has(l) && seen.add(l))
      .map(([l, , k]) => [l, k, C.prices[l][2] || (k === 'count' ? 'each' : 'per ' + unit(k))]);
    const sym = MMLocale.symbol(cur);
    const us = MMLocale.usPrices(cur);
    el.querySelector('.cost-help').textContent = us
      ? 'Rough typical US store prices. Type the prices at your store and the total updates.'
      : 'Type the prices at your local store and the total updates.';
    costTable.innerHTML = priced.map(([l, , per], n) => {
      let p = us ? C.prices[l][i()] : '';
      try { const s = localStorage.getItem(priceKey(l)); if (s !== null) p = s; } catch (e) {}
      return `<tr data-n="${n}"><th scope="row">${l}<span class="qty"></span></th>
        <td><span class="price"><span aria-hidden="true">${sym}</span><input type="number" inputmode="decimal" min="0" step="any" value="${p}" data-item="${l}" aria-label="Price for ${l}, ${per}"></span><span class="per">${per}</span></td>
        <td class="line"></td></tr>`;
    }).join('');
  }

  // Returns [[label, qty text, price, line cost]] and the total (NaN if any line is invalid), and paints the table.
  function updateCosts() {
    if (!C.prices) return { lines: [], total: NaN };
    let total = 0;
    const lines = [];
    // Rows follow the order of the results (the menus can add items, like nails for a metal roof, in the middle).
    const at = new Map((rows || []).map((r, n) => [r[0], n])), pos = tr => (at.has(priced[tr.dataset.n][0]) ? at.get(priced[tr.dataset.n][0]) : 1e9 + +tr.dataset.n);
    const trs = [...costTable.rows].sort((a, b) => pos(a) - pos(b));
    if (trs.some((tr, n) => tr !== costTable.rows[n])) trs.forEach(tr => tr.parentNode.appendChild(tr));
    trs.forEach(tr => {
      const [l, k] = priced[tr.dataset.n], row = rows && rows.find(r => r[0] === l);
      tr.hidden = !!rows && !row; // an item this choice doesn't use (an unfinished shed has no drywall) is left out
      if (tr.hidden) return;
      const qty = row ? (k === 'count' ? row[1] : fromBase(k, row[1])) : NaN, p = num(tr.querySelector('input').value), cost = qty * p;
      total += cost;
      tr.querySelector('.qty').textContent = row ? fmt(row[1], k) : '';
      tr.querySelector('.line').textContent = cost >= 0 ? money(cost) : '—';
      lines.push([l, row ? fmt(row[1], k) : '—', p, cost, k]);
    });
    totalEl.innerHTML = !rows ? '' : total >= 0 ? `Estimated total <b>${money(total)}</b>` : 'Enter a price for every item to see the total.';
    return { lines, total };
  }

  // Value of a field in base units, or NaN if it is empty or invalid.
  function read(id, k) {
    if (k === 'select') return Number(f(id).value);
    const x = num(f(id).value), o = opt(id, k);
    if (ftIn(id, k)) {
      const inch = num(f(id + '-in').value);
      if ((isNaN(x) && isNaN(inch)) || x < 0 || inch < 0) return NaN;
      return (x || 0) * FT + (inch || 0) * IN;
    }
    return o ? x * o[1] : U[k] ? x * U[k][i()][1] : k === 'pct' ? x / 100 : x;
  }

  // Remember the exact value behind each rounded number we display, so flipping units back and forth doesn't drift.
  const written = {};
  const snap = id => f(id).value + '|' + (f(id + '-in') ? f(id + '-in').value : '');
  function write(id, k, b) {
    if (!isFinite(b)) return;
    const o = opt(id, k);
    if (ftIn(id, k)) {
      let ft = Math.floor(b / FT + 1e-9), inch = round((b / FT - ft) * 12);
      if (inch >= 12) { ft += 1; inch = 0; }
      f(id).value = ft;
      f(id + '-in').value = inch || '';
    } else f(id).value = round(o ? b / o[1] : fromBase(k, b));
    written[id] = { b, shown: snap(id) };
  }

  // Field value as text for the copied summary.
  function shown(id, k) {
    if (k === 'select') return f(id).selectedOptions[0].text;
    if (ftIn(id, k)) return `${f(id).value || 0} ft` + (f(id + '-in').value ? ` ${f(id + '-in').value} in` : '');
    const u = opt(id, k) ? opt(id, k)[0] : unit(k);
    return `${f(id).value}${u ? ' ' + u : ''}`;
  }

  function fmt(b, k) {
    if (!isFinite(b)) return '—';
    if (k === 'count') return b.toLocaleString('en-US');
    if (k === 'cut' && sys === 'imp') return MM.frac(b / IN) + ' in'; // shop sizes read off a tape: 2 5/16 in
    return fromBase(k, b).toLocaleString('en-US', { maximumFractionDigits: k === 'cut' ? 1 : 2 }) + (U[k] ? ' ' + unit(k) : ''); // cut sizes in mm to a tenth
  }

  function invalid(msg) {
    rows = null;
    head.innerHTML = '';
    out.innerHTML = `<p class="hint">${msg}</p>`;
    copy.disabled = add.disabled = true;
    updateCosts();
  }

  function update() {
    const v = {};
    for (const [id, , k] of C.inputs) {
      const on = visible(id);
      f(id).closest('.field').hidden = !on;
      if (!on) { v[id] = 0; continue; }
      v[id] = read(id, k);
      if (!(v[id] >= 0)) return invalid('Enter a number (0 or more) in every field.');
    }
    if (ED) ED.apply(v); // a drawn floor plan fills in its own counts (inside walls, doors, windows)
    rows = C.compute(v, sys);
    // a 0 in a size or spacing we divide by gives Infinity, NaN or negative counts (stair rise 0 -> -1 treads)
    if (rows.some(r => !(r[1] >= 0 && isFinite(r[1])))) return invalid('Check your numbers: a size, spacing or height can\'t be 0.');
    lastV = v;
    queueView();
    // the headline is the calculator's chosen row, else the first "buy this many" row
    const main = rows.find(r => [].concat(C.head || []).includes(r[0])) || rows.find(r => r[2] === 'count') || rows[0];
    head.innerHTML = `<span class="big">${fmt(main[1], main[2])}</span><span>${main[0]}</span>`;
    out.innerHTML = '<table>' + rows.map(([l, b, k]) => `<tr><th scope="row">${l}</th><td>${fmt(b, k)}</td></tr>`).join('') + '</table>';
    copy.disabled = add.disabled = false;
    updateCosts();
  }

  function paintUnits() {
    el.classList.toggle('metric', sys === 'met');
    el.querySelectorAll('.unit').forEach(s => (s.textContent = unit(s.dataset.kind)));
    for (const [id, , k] of C.inputs) if (INPUT_UNITS[k]) {
      const s = el.querySelector(`.unit-sel[data-id="${id}"]`);
      s.innerHTML = INPUT_UNITS[k][sys].map(([u]) => `<option>${u}</option>`).join('');
      s.value = opt(id, k)[0];
      f(id).closest('.inp').classList.toggle('ftin', ftIn(id, k));
    }
    el.querySelectorAll('[data-sys]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sys === sys));
    buildCosts();
  }

  el.querySelectorAll('[data-sys]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.sys === sys) return;
    const base = {};
    for (const [id, , k] of C.inputs) base[id] = written[id] && written[id].shown === snap(id) ? written[id].b : read(id, k);
    sys = b.dataset.sys;
    for (const id in fu) delete fu[id]; // every box goes back to the new system's usual unit
    try { localStorage.setItem('mm-sys', sys); } catch (e) {}
    for (const [id, , k] of C.inputs) if (k !== 'select') write(id, k, base[id]);
    paintUnits();
    update();
  }));

  copy.addEventListener('click', async () => {
    if (!rows) return;
    const { lines, total } = updateCosts();
    const costText = lines.length ? ['', 'Cost estimate:', ...lines.map(([l, q, p, c]) => `${l}: ${q}${p >= 0 ? ` × ${money(p)}` : ''} = ${c >= 0 ? money(c) : '—'}`), ...(total >= 0 ? [`Estimated total: ${money(total)}`] : [])] : [];
    const text = [C.title, '', ...shownInputs().map(([id, label, k]) => `${label}: ${shown(id, k)}`), '', ...rows.map(([l, b, k]) => `${l}: ${fmt(b, k)}`), ...costText, '', location.href].join('\n');
    const ok = await MMCopy(text);
    copy.textContent = ok ? 'Copied!' : 'Could not copy';
    setTimeout(() => (copy.textContent = 'Copy results'), 2000);
  });

  el.addEventListener('input', e => {
    const item = e.target.dataset.item;
    if (item) try { localStorage.setItem(priceKey(item), e.target.value); } catch (err) {}
    else el.querySelectorAll('[data-preset]').forEach(b => b.setAttribute('aria-pressed', 'false')); // edited: no longer the sample
    update();
  });
  // Sample builds fill every field they list. Values are in imperial units, like the defaults; menus use the option's position.
  el.querySelectorAll('[data-preset]').forEach(b => b.addEventListener('click', () => {
    if (ED && !ED.preset(autoPreset)) return; // keeps the visitor's own floor plan unless they agree to replace it
    const vals = C.presets[b.dataset.preset][1];
    for (const [id, , k, , opts] of C.inputs) if (id in vals) {
      if (k === 'select') f(id).value = opts[vals[id]][1];
      else { delete fu[id]; write(id, k, U[k] ? vals[id] * U[k][0][1] : k === 'pct' ? vals[id] / 100 : vals[id]); }
    }
    paintUnits();
    update();
    el.querySelectorAll('[data-preset]').forEach(x => x.setAttribute('aria-pressed', x === b));
  }));
  // Changing one box's unit converts the number already in it (4 in -> 101.6 mm) instead of reinterpreting it.
  el.addEventListener('change', e => {
    const s = e.target.closest('.unit-sel');
    if (!s) return;
    const id = s.dataset.id, k = C.inputs.find(x => x[0] === id)[2];
    const base = written[id] && written[id].shown === snap(id) ? written[id].b : read(id, k); // read with the old unit
    fu[id] = s.value;
    if (isFinite(base)) write(id, k, base);
    paintUnits();
    update();
  });
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.classList.contains('tip')) e.target.blur(); });
  el.addEventListener('focusin', e => { if (e.target.tagName === 'INPUT') e.target.select(); }); // typing replaces the old number

  // ---- Live drawings (views.js): a 3D model to drag around and a blueprint-style plan, redrawn from the numbers.
  // They sit in the picture panel next to the calculator, with the original "What to measure" picture as a third tab.
  const VIEW = window.MMViews && MMViews.views[C.slug], fig = document.querySelector('.diagram');
  const cam = { yaw: -0.62, elev: 0.55, noRoof: false };
  let lastV = null, queued = false, tab = '3d', vbox = null, roofBtn = null, upperBtn = null, ED = null;
  // Zoom for each drawing: z is the zoom level, (x, y) the centre of what shows, in the 400 x 300 drawing.
  const ZOOM0 = () => ({ z: 1, x: 200, y: 150 }), zoom = { '3d': ZOOM0(), plan: ZOOM0() };
  function applyZoom() {
    const svg = vbox && vbox.querySelector('svg'), q = zoom[tab];
    if (!svg || !q) return;
    q.z = Math.min(8, Math.max(1, q.z));
    const w = 400 / q.z, h = 300 / q.z; // keep the view inside the drawing
    q.x = Math.min(400 - w / 2, Math.max(w / 2, q.x));
    q.y = Math.min(300 - h / 2, Math.max(h / 2, q.y));
    svg.setAttribute('viewBox', `${(q.x - w / 2).toFixed(2)} ${(q.y - h / 2).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}`);
    vbox.classList.toggle('zoomed', q.z > 1); // zoomed in, one finger moves the drawing instead of scrolling the page
    if (zoomOut) zoomOut.disabled = q.z <= 1;
    if (zoomIn) zoomIn.disabled = q.z >= 8;
  }
  // Zoom by factor f, keeping the point under the pointer (client coordinates) still; without a point, around the middle.
  function zoomBy(f, cx, cy) {
    const svg = vbox && vbox.querySelector('svg'), q = zoom[tab];
    if (!svg || !q) return;
    let px = q.x, py = q.y;
    if (cx != null) { const r = svg.getBoundingClientRect(); px = q.x + ((cx - r.left) / r.width - 0.5) * (400 / q.z); py = q.y + ((cy - r.top) / r.height - 0.5) * (300 / q.z); }
    const nz = Math.min(8, Math.max(1, q.z * f));
    q.x = px - (px - q.x) * (q.z / nz);
    q.y = py - (py - q.y) * (q.z / nz);
    q.z = nz;
    applyZoom();
  }
  // Move the view by a pointer movement in screen pixels.
  function panBy(dx, dy) {
    const svg = vbox && vbox.querySelector('svg'), q = zoom[tab];
    if (!svg || !q) return;
    const r = svg.getBoundingClientRect();
    q.x -= (dx / r.width) * (400 / q.z);
    q.y -= (dy / r.height) * (300 / q.z);
    applyZoom();
  }
  let zoomIn = null, zoomOut = null;
  try { tab = localStorage.getItem('mm-view') || '3d'; } catch (e) {}
  function drawView() {
    queued = false;
    if (!vbox || !lastV || tab === 'pic') return;
    try {
      const sc = new MMViews.Scene();
      VIEW(lastV, sc, { len: b => fmt(b, 'len'), cut: b => fmt(b, 'cut'), sys, ...(ED ? ED.view() : {}) });
      roofBtn.hidden = !(tab === '3d' && sc.hasRoof && !cam.ground);
      upperBtn.hidden = !(tab === '3d' && sc.floors > 1);
      const body = tab === '3d' ? MMViews.render3d(sc, cam) : MMViews.renderPlan(sc);
      vbox.className = 'vbox ' + (tab === '3d' ? 'is-3d' : 'is-plan');
      vbox.innerHTML = body
        ? `<svg viewBox="0 0 400 300" role="img" aria-label="${tab === '3d' ? '3D view' : 'Plan view'} of your measurements">${tab === 'plan' ? '<rect class="pl-bg" width="400" height="300"/>' : ''}${body}</svg>`
        : '<p class="hint">Enter your measurements to see the drawing.</p>';
      applyZoom();
      if (ED && tab === 'plan' && body) ED.drawn(vbox.querySelector('svg'), sc);
    } catch (e) { vbox.innerHTML = '<p class="hint">This drawing could not be shown for these numbers.</p>'; }
  }
  function queueView() { if (vbox && !queued) { queued = true; requestAnimationFrame(drawView); } }
  if (VIEW && fig) {
    const pic = fig.querySelector('svg'), cap = fig.querySelector('figcaption');
    const names = { '3d': '3D view · drag to turn, scroll or pinch to zoom', plan: 'Plan view · scroll or pinch to zoom, drag to move', pic: 'What to measure' };
    fig.closest('.tool').classList.add('has-views');
    fig.insertAdjacentHTML('afterbegin', `<div class="vtabs" role="tablist" aria-label="Drawing">${
      [['3d', '3D view'], ['plan', 'Plan'], ['pic', 'What to measure']].map(([k, t]) => `<button type="button" role="tab" data-v="${k}">${t}</button>`).join('')}</div>`);
    pic.insertAdjacentHTML('afterend', `<div class="vbox" tabindex="0"></div><div class="vtools"><button type="button" data-t="in" aria-label="Zoom in">+</button><button type="button" data-t="out" aria-label="Zoom out">−</button><button type="button" data-t="reset">Reset view</button><button type="button" data-t="roof" hidden>Hide roof</button><button type="button" data-t="upper" hidden>Hide upper floor</button><button type="button" data-t="wide" data-tip="Shows the drawing across the whole width, above the calculator.">Bigger</button></div>`);
    vbox = fig.querySelector('.vbox');
    roofBtn = fig.querySelector('[data-t="roof"]');
    upperBtn = fig.querySelector('[data-t="upper"]');
    const tools = fig.querySelector('.vtools');
    zoomIn = fig.querySelector('[data-t="in"]');
    zoomOut = fig.querySelector('[data-t="out"]');
    // A calculator's own editor (house-plan.js: draw your own floor plan), given what it needs from this page.
    if (window.MMEditors && MMEditors[C.slug]) ED = MMEditors[C.slug]({
      el, fig, field: f, write, fmt, sys: () => sys, values: () => lastV, update, redraw: queueView, pan: panBy,
    });
    const setTab = t => {
      tab = names[t] ? t : '3d';
      try { localStorage.setItem('mm-view', tab); } catch (e) {}
      pic.style.display = tab === 'pic' ? '' : 'none'; // an <svg> ignores the hidden attribute
      vbox.hidden = tab === 'pic';
      tools.hidden = tab === 'pic';
      cap.textContent = names[tab];
      fig.querySelectorAll('[data-v]').forEach(b => b.setAttribute('aria-selected', b.dataset.v === tab));
      if (ED) ED.tab(tab);
      queueView();
    };
    fig.querySelector('.vtabs').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) setTab(b.dataset.v); });
    tools.addEventListener('click', e => {
      const t = e.target.closest('[data-t]');
      if (!t) return;
      if (t.dataset.t === 'in' || t.dataset.t === 'out') { zoomBy(t.dataset.t === 'in' ? 1.4 : 1 / 1.4); return; }
      if (t.dataset.t === 'reset') { if (tab === '3d') { cam.yaw = -0.62; cam.elev = 0.55; } zoom[tab] = ZOOM0(); }
      else if (t.dataset.t === 'roof') { cam.noRoof = !cam.noRoof; t.textContent = cam.noRoof ? 'Show roof' : 'Hide roof'; }
      else if (t.dataset.t === 'upper') { cam.ground = !cam.ground; t.textContent = cam.ground ? 'Show upper floor' : 'Hide upper floor'; }
      else { const wide = fig.closest('.tool').classList.toggle('wide'); t.textContent = wide ? 'Smaller' : 'Bigger'; }
      queueView();
    });
    // 3D: drag (mouse, pen or a sideways swipe) to turn; Shift-drag or right-drag moves it. Plan: drag moves it.
    // Scroll wheel or two-finger pinch zooms either one; two fingers also move it. Arrow keys turn, + and - zoom.
    const pts = new Map();
    let pinch = null, moveMode = false, editing = false; // editing: the plan editor has this pointer
    const two = () => { const [a, b] = [...pts.values()]; return { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2 }; };
    vbox.addEventListener('pointerdown', e => {
      if (tab === 'pic') return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      moveMode = tab === 'plan' || e.shiftKey || e.button === 2;
      pinch = pts.size === 2 ? two() : null;
      try { vbox.setPointerCapture(e.pointerId); } catch (err) {}
      if (pts.size === 1 && ED && tab === 'plan' && !e.shiftKey && e.button === 0) editing = ED.down(e);
      else if (editing) { ED.cancel(); editing = false; } // a second finger: pinch instead
    });
    vbox.addEventListener('pointermove', e => {
      const last = pts.get(e.pointerId);
      if (ED && tab === 'plan' && (editing || !last)) { ED.move(e); if (editing) return; }
      if (!last) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size >= 2) {
        if (!pinch) { pinch = two(); return; }
        const now = two();
        panBy(now.x - pinch.x, now.y - pinch.y);
        zoomBy(now.d / pinch.d, now.x, now.y);
        pinch = now;
        return;
      }
      const dx = e.clientX - last[0], dy = e.clientY - last[1];
      if (moveMode) { panBy(dx, dy); return; }
      cam.yaw += dx * 0.01;
      cam.elev = Math.min(1.5, Math.max(0.06, cam.elev + dy * 0.008));
      queueView();
    });
    const end = e => { pts.delete(e.pointerId); pinch = null; };
    vbox.addEventListener('pointerup', e => { if (editing) { editing = false; ED.up(e); } end(e); });
    vbox.addEventListener('pointercancel', e => { if (editing) { editing = false; ED.cancel(); } end(e); });
    vbox.addEventListener('pointerleave', () => { if (ED) ED.leave(); });
    vbox.addEventListener('contextmenu', e => { if (tab === '3d') e.preventDefault(); });
    vbox.addEventListener('wheel', e => {
      if (tab === 'pic' || !vbox.querySelector('svg')) return;
      e.preventDefault();
      zoomBy(Math.exp(-Math.max(-100, Math.min(100, e.deltaY)) * 0.0025), e.clientX, e.clientY);
    }, { passive: false });
    vbox.addEventListener('keydown', e => {
      if (ED && tab === 'plan' && ED.key(e)) return;
      if (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '_') { e.preventDefault(); zoomBy(e.key === '+' || e.key === '=' ? 1.4 : 1 / 1.4); return; }
      if (tab !== '3d') return;
      const k = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.08], ArrowDown: [0, -0.08] }[e.key];
      if (!k) return;
      e.preventDefault();
      cam.yaw += k[0];
      cam.elev = Math.min(1.5, Math.max(0.06, cam.elev + k[1]));
      queueView();
    });
    setTab(tab);
  }

  // defaults are imperial; write() converts them if the visitor last chose metric
  for (const [id, , k, def] of C.inputs) if (k !== 'select') write(id, k, U[k] ? def * U[k][0][1] : k === 'pct' ? def / 100 : def);
  if (ED && ED.start) ED.start(); // a saved floor plan brings back its building size
  paintUnits();
  update();
  // ?sample=N opens the page with that sample build filled in (the home page links to them)
  const sample = new URLSearchParams(location.search).get('sample'), btn = sample && el.querySelector(`[data-preset="${CSS.escape(sample)}"]`);
  let autoPreset = false;
  if (btn) { autoPreset = true; btn.click(); autoPreset = false; }
})();
