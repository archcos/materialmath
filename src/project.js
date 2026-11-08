// The /project/ page: everything saved with "Add to project", combined into one shopping list and total.
(function () {
  const root = document.getElementById('project');
  if (!root) return;
  const money = (x, cur) => MMLocale.money(x, cur);
  const curOf = it => it.currency || 'USD'; // items saved before currencies existed were dollars
  // Items can be in different currencies, so the total is one sum per currency ("$1,200.00 + £80.00").
  const totalText = lines => {
    const sums = new Map();
    for (const l of lines) sums.set(l.cur, (sums.get(l.cur) || 0) + l.cost);
    return [...sums].map(([cur, s]) => money(s, cur)).join(' + ');
  };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const ok = x => typeof x === 'number' && isFinite(x); // saved NaN comes back from JSON as null
  const qtyText = (q, unit) => q.toLocaleString('en-US', { maximumFractionDigits: 2 }) + (unit ? ' ' + unit : '');
  const short = t => t.replace(/ Calculator$/, '');

  // Same item from the same calculator (two slabs, say) becomes one line. Different calculators stay apart,
  // because "Boxes" of tile and "Boxes" of flooring are not the same thing.
  function combine(list) {
    const lines = new Map();
    for (const it of list) for (const c of it.costs) {
      const key = `${it.slug}|${c.label}|${c.unit}|${curOf(it)}`;
      const l = lines.get(key) || { label: `${short(it.title)}: ${c.label}`, unit: c.unit, cur: curOf(it), qty: 0, cost: 0, priced: true };
      l.qty += c.qty;
      if (ok(c.cost)) l.cost += c.cost; else l.priced = false;
      lines.set(key, l);
    }
    return [...lines.values()];
  }

  function render() {
    const list = MMProject.get();
    if (!list.length) {
      root.innerHTML = `<p class="empty">Your project is empty. Open any <a href="/#calculators">calculator</a>, enter your measurements and press <b>+ Add to project</b>. Add as many as the job needs, for example a concrete slab, the gravel base under it and a fence, and they all add up here.</p>`;
      return;
    }
    const lines = combine(list), missing = lines.some(l => !l.priced);
    root.innerHTML = `<h2 class="res-title">Shopping list</h2>
    ${lines.length ? `<table class="costs">${lines.map(l => `<tr><th scope="row">${esc(l.label)}<span class="qty">${qtyText(l.qty, l.unit)}</span></th><td class="line money">${l.priced ? money(l.cost, l.cur) : '—'}</td></tr>`).join('')}</table>
    <p class="total money">Project total <b>${totalText(lines)}</b></p>
    ${missing ? '<p class="help money">Some items have no price, so the total leaves them out. Add a price on the calculator and add it again.</p>' : ''}`
      : '<p class="help">None of these calculators has prices, so there is no cost total.</p>'}
    <div class="actions"><button type="button" class="btn" data-act="print" data-tip="Prints the combined shopping list, the total and every item on one handout.">Print project</button>${lines.length
      ? '<button type="button" class="btn alt" data-act="print-qty" data-tip="The same printout without any prices or totals. Handy for giving to a supplier or helper.">Print without prices</button>' : ''}<button type="button" class="copy" data-act="copy" data-tip="Copies the shopping list, total and each item's measurements as text, ready to paste into a text message, email or notes.">Copy project</button><button type="button" class="btn alt" data-act="clear" data-tip="Removes every item from your project. You'll be asked to confirm first.">Clear project</button></div>
    <h2 class="res-title">Items (${list.length})</h2>
    ${list.map(it => `<section class="pitem">
      <div class="pitem-head"><a href="/${it.slug}/">${esc(it.title)}</a><button type="button" class="remove" data-id="${esc(it.id)}" aria-label="Remove ${esc(it.title)}">Remove</button></div>
      <p class="help">${it.inputs.map(([l, v]) => `${esc(l)}: ${esc(v)}`).join(' · ')}</p>
      <table class="costs">${(it.costs.length
        ? it.costs.map(c => `<tr><th scope="row">${esc(c.label)}<span class="qty">${esc(c.qtyText)}${ok(c.price) ? `<span class="money"> × ${money(c.price, curOf(it))}</span>` : ''}</span></th><td class="line money">${ok(c.cost) ? money(c.cost, curOf(it)) : '—'}</td></tr>`)
        : it.rows.map(([l, v]) => `<tr><th scope="row">${esc(l)}</th><td class="line">${esc(v)}</td></tr>`)).join('')}</table>
    </section>`).join('')}`;
  }

  function asText() {
    const list = MMProject.get(), lines = combine(list);
    return ['My project', '', 'Shopping list:', ...lines.map(l => `${l.label}: ${qtyText(l.qty, l.unit)}${l.priced ? ` = ${money(l.cost, l.cur)}` : ''}`),
      ...(lines.length ? [`Project total: ${totalText(lines)}`] : []), '',
      ...list.flatMap(it => [it.title, ...it.inputs.map(([l, v]) => `  ${l}: ${v}`), ...it.rows.map(([l, v]) => `  ${l}: ${v}`),
        ...(it.costs.length ? ['  Cost:', ...it.costs.map(c => `    ${c.label}: ${c.qtyText}${ok(c.price) ? ` × ${money(c.price, curOf(it))}` : ''} = ${ok(c.cost) ? money(c.cost, curOf(it)) : '—'}`)] : []), '']),
      location.origin + '/'].join('\n');
  }

  root.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.id) MMProject.save(MMProject.get().filter(it => it.id !== b.dataset.id));
    else if (b.dataset.act === 'clear') { if (confirm('Remove every item from your project?')) MMProject.save([]); }
    else if ((b.dataset.act || '').startsWith('print')) {
      document.body.classList.toggle('print-no-cost', b.dataset.act === 'print-qty'); // print CSS hides .money
      window.print();
    }
    else if (b.dataset.act === 'copy') {
      b.textContent = (await MMCopy(asText())) ? 'Copied!' : 'Could not copy';
      setTimeout(() => (b.textContent = 'Copy project'), 2000);
    }
  });
  addEventListener('afterprint', () => document.body.classList.remove('print-no-cost'));
  addEventListener('mm-project', render);
  addEventListener('storage', e => { if (e.key === 'mm-project') render(); });
  render();
})();
