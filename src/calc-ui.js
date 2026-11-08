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
  const f = id => document.getElementById('f-' + id);
  const ftIn = k => k === 'len' && sys === 'imp'; // feet fields get a second box for inches

  // The "?" shows the tip on hover, tap or keyboard focus; the input is also described by it for screen readers.
  const field = ([id, label, kind, def, opts]) => `<div class="field"><div class="lab"><label for="f-${id}">${label}</label>${
    C.tips[id] ? `<button type="button" class="tip" aria-label="Tip: ${label}">?</button><span class="tooltip" role="tooltip" id="t-${id}">${C.tips[id]}</span>` : ''
  }</div><div class="inp">${
    kind === 'select'
      ? `<select id="f-${id}" aria-describedby="t-${id}">${opts.map((o, n) => `<option value="${o[1]}"${n === def ? ' selected' : ''}>${o[0]}</option>`).join('')}</select>`
      : `<input id="f-${id}" type="number" inputmode="decimal" min="0" step="any" aria-describedby="t-${id}">`
  }<span class="unit" data-kind="${kind}"></span>${
    kind === 'len' ? `<input id="f-${id}-in" class="in-box" type="number" inputmode="decimal" min="0" step="any" placeholder="0" aria-label="${label}, inches"><span class="unit-in in-box">in</span>` : ''
  }</div>${hints[id] ? `<p class="help">${hints[id]}</p>` : ''}</div>`;

  el.innerHTML = `<div class="units" role="group" aria-label="Units">
      <button type="button" data-sys="imp">Imperial (ft, in)</button><button type="button" data-sys="met">Metric (m, cm)</button></div>
    <form class="fields" onsubmit="return false">${C.inputs.map(field).join('')}</form>
    <h2 class="res-title">You need</h2>
    <div class="headline" aria-live="polite"></div>
    <div class="results"></div>
    ${C.prices ? `<div class="cost"><div class="cost-head"><h2 class="res-title">Cost estimate</h2>
    <label class="cur">Currency <select>${MMLocale.currencies.map(c => `<option value="${c}"${c === cur ? ' selected' : ''}>${c} · ${MMLocale.name(c)}</option>`).join('')}</select></label></div>
    <table class="costs"></table>
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
      inputs: C.inputs.map(([id, label, k]) => [label, shown(id, k)]),
      rows: rows.map(([l, b, k]) => [l, fmt(b, k)]),
      costs: lines.map(([label, qtyText, price, cost], n) => {
        const k = priced[n][1], b = rows.find(r => r[0] === label)[1];
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
  const curSelect = el.querySelector('.cur select');
  if (curSelect) curSelect.addEventListener('change', () => {
    cur = curSelect.value;
    MMLocale.setCurrency(cur);
    buildCosts();
    update();
  });
  let priced = []; // [label, kind, per-text] for the current unit system

  function buildCosts() {
    if (!C.prices) return;
    const ones = Object.fromEntries(C.inputs.map(([id]) => [id, 1])); // any valid input gives the row labels for this unit system
    const seen = new Set();
    priced = C.compute(ones, sys).filter(([l]) => C.prices[l] && !seen.has(l) && seen.add(l))
      .map(([l, , k]) => [l, k, C.prices[l][2] || (k === 'count' ? 'each' : 'per ' + unit(k))]);
    const sym = MMLocale.symbol(cur);
    const us = MMLocale.usPrices(cur);
    el.querySelector('.cost-help').textContent = us
      ? 'Rough typical US store prices. Type the prices at your store and the total updates.'
      : 'Type the prices at your local store and the total updates.';
    costTable.innerHTML = priced.map(([l, , per]) => {
      let p = us ? C.prices[l][i()] : '';
      try { const s = localStorage.getItem(priceKey(l)); if (s !== null) p = s; } catch (e) {}
      return `<tr><th scope="row">${l}<span class="qty"></span></th>
        <td><span class="price"><span aria-hidden="true">${sym}</span><input type="number" inputmode="decimal" min="0" step="any" value="${p}" data-item="${l}" aria-label="Price for ${l}, ${per}"></span><span class="per">${per}</span></td>
        <td class="line"></td></tr>`;
    }).join('');
  }

  // Returns [[label, qty text, price, line cost]] and the total (NaN if any line is invalid), and paints the table.
  function updateCosts() {
    if (!C.prices) return { lines: [], total: NaN };
    let total = 0;
    const lines = [...costTable.rows].map((tr, n) => {
      const [l, k] = priced[n], row = rows && rows.find(r => r[0] === l);
      const qty = row ? (k === 'count' ? row[1] : fromBase(k, row[1])) : NaN, p = num(tr.querySelector('input').value), cost = qty * p;
      total += cost;
      tr.querySelector('.qty').textContent = row ? fmt(row[1], k) : '';
      tr.querySelector('.line').textContent = cost >= 0 ? money(cost) : '—';
      return [l, row ? fmt(row[1], k) : '—', p, cost];
    });
    totalEl.innerHTML = !rows ? '' : total >= 0 ? `Estimated total <b>${money(total)}</b>` : 'Enter a price for every item to see the total.';
    return { lines, total };
  }

  // Value of a field in base units, or NaN if it is empty or invalid.
  function read(id, k) {
    if (k === 'select') return Number(f(id).value);
    const x = num(f(id).value);
    if (ftIn(k)) {
      const inch = num(f(id + '-in').value);
      if ((isNaN(x) && isNaN(inch)) || x < 0 || inch < 0) return NaN;
      return (x || 0) * FT + (inch || 0) * IN;
    }
    return U[k] ? x * U[k][i()][1] : k === 'pct' ? x / 100 : x;
  }

  // Remember the exact value behind each rounded number we display, so flipping units back and forth doesn't drift.
  const written = {};
  const snap = id => f(id).value + '|' + (f(id + '-in') ? f(id + '-in').value : '');
  function write(id, k, b) {
    if (!isFinite(b)) return;
    if (ftIn(k)) {
      let ft = Math.floor(b / FT + 1e-9), inch = round((b / FT - ft) * 12);
      if (inch >= 12) { ft += 1; inch = 0; }
      f(id).value = ft;
      f(id + '-in').value = inch || '';
    } else f(id).value = round(fromBase(k, b));
    written[id] = { b, shown: snap(id) };
  }

  // Field value as text for the copied summary.
  function shown(id, k) {
    if (k === 'select') return f(id).selectedOptions[0].text;
    if (ftIn(k)) return `${f(id).value || 0} ft` + (f(id + '-in').value ? ` ${f(id + '-in').value} in` : '');
    return `${f(id).value}${unit(k) ? ' ' + unit(k) : ''}`;
  }

  function fmt(b, k) {
    if (!isFinite(b)) return '—';
    if (k === 'count') return b.toLocaleString('en-US');
    return fromBase(k, b).toLocaleString('en-US', { maximumFractionDigits: 2 }) + (U[k] ? ' ' + unit(k) : '');
  }

  function update() {
    const v = {};
    for (const [id, , k] of C.inputs) {
      v[id] = read(id, k);
      if (!(v[id] >= 0)) {
        rows = null;
        head.innerHTML = '';
        out.innerHTML = '<p class="hint">Enter a number (0 or more) in every field.</p>';
        copy.disabled = add.disabled = true;
        updateCosts();
        return;
      }
    }
    rows = C.compute(v, sys);
    const main = rows.find(r => r[2] === 'count') || rows[0]; // the headline is the first "buy this many" row
    head.innerHTML = `<span class="big">${fmt(main[1], main[2])}</span><span>${main[0]}</span>`;
    out.innerHTML = '<table>' + rows.map(([l, b, k]) => `<tr><th scope="row">${l}</th><td>${fmt(b, k)}</td></tr>`).join('') + '</table>';
    copy.disabled = add.disabled = false;
    updateCosts();
  }

  function paintUnits() {
    el.classList.toggle('metric', sys === 'met');
    el.querySelectorAll('.unit').forEach(s => (s.textContent = unit(s.dataset.kind)));
    el.querySelectorAll('[data-sys]').forEach(b => b.setAttribute('aria-pressed', b.dataset.sys === sys));
    buildCosts();
  }

  el.querySelectorAll('[data-sys]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.sys === sys) return;
    const base = {};
    for (const [id, , k] of C.inputs) base[id] = written[id] && written[id].shown === snap(id) ? written[id].b : read(id, k);
    sys = b.dataset.sys;
    try { localStorage.setItem('mm-sys', sys); } catch (e) {}
    for (const [id, , k] of C.inputs) if (k !== 'select') write(id, k, base[id]);
    paintUnits();
    update();
  }));

  copy.addEventListener('click', async () => {
    if (!rows) return;
    const { lines, total } = updateCosts();
    const costText = lines.length ? ['', 'Cost estimate:', ...lines.map(([l, q, p, c]) => `${l}: ${q}${p >= 0 ? ` × ${money(p)}` : ''} = ${c >= 0 ? money(c) : '—'}`), ...(total >= 0 ? [`Estimated total: ${money(total)}`] : [])] : [];
    const text = [C.title, '', ...C.inputs.map(([id, label, k]) => `${label}: ${shown(id, k)}`), '', ...rows.map(([l, b, k]) => `${l}: ${fmt(b, k)}`), ...costText, '', location.href].join('\n');
    const ok = await MMCopy(text);
    copy.textContent = ok ? 'Copied!' : 'Could not copy';
    setTimeout(() => (copy.textContent = 'Copy results'), 2000);
  });

  el.addEventListener('input', e => {
    const item = e.target.dataset.item;
    if (item) try { localStorage.setItem(priceKey(item), e.target.value); } catch (err) {}
    update();
  });
  el.addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.classList.contains('tip')) e.target.blur(); });
  el.addEventListener('focusin', e => { if (e.target.tagName === 'INPUT') e.target.select(); }); // typing replaces the old number

  // defaults are imperial; write() converts them if the visitor last chose metric
  for (const [id, , k, def] of C.inputs) if (k !== 'select') write(id, k, U[k] ? def * U[k][0][1] : k === 'pct' ? def / 100 : def);
  paintUnits();
  update();
})();
