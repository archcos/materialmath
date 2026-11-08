// Checks every formula against a hand-worked answer (the same examples the articles use). Run: node test.js
const assert = require('assert');
const fs = require('fs');
const { CALCS, UNITS } = require('./src/formulas.js');

const FT = 0.3048, IN = 0.0254, FT2 = FT * FT, FT3 = FT2 * FT, YD3 = 27 * FT3, GAL = 0.003785411784;
const ft = x => x * FT, inch = x => x * IN;

function get(slug, v, label, kind, sys = 'imp') {
  const row = CALCS.find(c => c.slug === slug).compute(v, sys).find(r => r[0] === label && (!kind || r[2] === kind));
  assert(row, `${slug}: no row "${label}"`);
  return row[1];
}
const near = (actual, expected, msg) => assert(Math.abs(actual - expected) < 0.01, `${msg}: got ${actual}, expected ${expected}`);

const slab = { L: ft(10), W: ft(10), T: inch(4), waste: 0.1 };
near(get('concrete-calculator', slab, 'Volume needed', 'vol') / YD3, 1.358, 'slab cu yd');
assert.strictEqual(get('concrete-calculator', slab, '80 lb bags'), 62);
assert.strictEqual(get('concrete-calculator', { L: 1, W: 1, T: 1, waste: 0 }, '25 kg bags', null, 'met'), 86);

near(get('concrete-column-calculator', { D: inch(12), H: ft(4), P: 0, N: 1, waste: 0 }, 'Volume needed', 'cuft') / FT3, Math.PI, 'column');
assert.strictEqual(get('concrete-column-calculator', { D: inch(10), H: ft(3), P: inch(3.5), N: 1, waste: 0.1 }, '80 lb bags'), 3);

assert.strictEqual(get('concrete-block-calculator', { L: ft(20), H: ft(4), B: 128 * IN * IN, waste: 0.05 }, 'Blocks needed'), 95);
assert.strictEqual(get('brick-calculator', { L: ft(10), H: ft(10), B: 8 * (8 / 3) * IN * IN, layers: 1, waste: 0 }, 'Bricks needed'), 675);
assert.strictEqual(get('brick-calculator', { L: ft(20), H: ft(4), B: 8 * (8 / 3) * IN * IN, layers: 2, waste: 0.05 }, 'Bricks needed'), 1134);

near(get('gravel-calculator', { L: ft(10), W: ft(10), D: inch(3), waste: 0 }, 'Volume needed', 'vol') / YD3, 0.926, 'gravel');
assert.strictEqual(get('mulch-calculator', { L: ft(10), W: ft(10), D: inch(3), waste: 0.05 }, '2 cu ft bags'), 14);
assert.strictEqual(get('paver-calculator', { L: ft(10), W: ft(10), PL: inch(8), PW: inch(4), waste: 0 }, 'Pavers needed'), 450);

const sod = { L: ft(20), W: ft(25), waste: 0.05 };
assert.strictEqual(get('sod-calculator', sod, 'Pieces (2 × 5 ft)'), 53);
assert.strictEqual(get('sod-calculator', sod, 'Pallets (about 450 sq ft)'), 2);

const fence = { L: ft(100), S: ft(8), R: 2 };
assert.strictEqual(get('fence-calculator', fence, 'Posts'), 14);
assert.strictEqual(get('fence-calculator', fence, 'Rails'), 26);

const paint = { L: ft(12), W: ft(12), H: ft(8), doors: 1, windows: 2, coats: 2, ceil: 0 };
near(get('paint-calculator', paint, 'Area to paint') / FT2, 334, 'paint area');
near(get('paint-calculator', paint, 'Paint needed') / GAL, 1.909, 'paint gallons');
assert.strictEqual(get('paint-calculator', paint, '1 gallon cans'), 2);

const tile = { L: ft(10), W: ft(10), TL: inch(12), TW: inch(12), box: 10, waste: 0.1 };
assert.strictEqual(get('tile-calculator', tile, 'Tiles needed'), 110);
assert.strictEqual(get('tile-calculator', tile, 'Boxes'), 11);
assert.strictEqual(get('flooring-calculator', { L: ft(12), W: ft(15), box: 20 * FT2, waste: 0.1 }, 'Boxes'), 10);

const dry = { L: ft(12), W: ft(12), H: ft(8), ceil: 0, S: 32 * FT2, waste: 0.1 };
assert.strictEqual(get('drywall-calculator', dry, 'Sheets'), 14);
assert.strictEqual(get('drywall-calculator', { ...dry, ceil: 1 }, 'Sheets'), 19);
assert.strictEqual(get('baseboard-calculator', { L: ft(12), W: ft(12), doors: 1, DW: inch(36), PL: ft(8), waste: 0.1 }, 'Pieces'), 7);

const deck = { L: ft(16), W: ft(12), BW: inch(5.5), gap: inch(0.125), BL: ft(16), JS: inch(16), waste: 0.1 };
assert.strictEqual(get('deck-calculator', deck, 'Deck boards'), 29);
assert.strictEqual(get('deck-calculator', deck, 'Joists'), 13);

const roof = { L: ft(40), W: ft(30), pitch: Math.sqrt(1.25), waste: 0.1 };
near(get('roofing-calculator', roof, 'Roofing squares'), 14.758, 'roof squares');
assert.strictEqual(get('roofing-calculator', roof, 'Shingle bundles (3 per square)'), 45);

const stairs = { rise: inch(108), max: inch(7.75), tread: inch(10) };
assert.strictEqual(get('stair-calculator', stairs, 'Risers (steps)'), 14);
near(get('stair-calculator', stairs, 'Riser height') / IN, 7.714, 'riser height');
near(get('stair-calculator', stairs, 'Stringer length') / IN, 169.0, 'stringer');

near(get('board-foot-calculator', { T: inch(2), W: inch(6), L: ft(8), N: 10 }, 'Board feet'), 80, 'board feet');
near(get('square-footage-calculator', { L: ft(12), W: ft(15) }, 'Area') / FT2, 180, 'square feet');

// Every calculator has an article, and its defaults give finite results in both unit systems.
for (const c of CALCS) {
  assert(fs.existsSync(`content/${c.slug}.html`), `missing content/${c.slug}.html`);
  const v = Object.fromEntries(c.inputs.map(([id, , k, def, opts]) => [id, k === 'select' ? opts[def][1] : UNITS[k] ? def * UNITS[k][0][1] : k === 'pct' ? def / 100 : def]));
  for (const sys of ['imp', 'met']) for (const [l, b] of c.compute(v, sys)) assert(Number.isFinite(b), `${c.slug} ${sys} "${l}" is ${b}`);
  for (const [id] of c.inputs) assert(c.tips[id], `${c.slug}: no tip for input "${id}"`);
  // Every price matches a result row, and each unit system that shows the row has a default price for it.
  for (const [label, p] of Object.entries(c.prices || {})) {
    const shown = ['imp', 'met'].filter(sys => c.compute(v, sys).some(r => r[0] === label));
    assert(shown.length, `${c.slug}: price "${label}" matches no result row`);
    for (const sys of shown) assert(p[sys === 'imp' ? 0 : 1] > 0, `${c.slug}: no ${sys} price for "${label}"`);
  }
}

console.log(`All formula checks passed for ${CALCS.length} calculators.`);
