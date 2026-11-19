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

near(get('concrete-column-calculator', { D: inch(12), H: ft(4), P: 0, N: 1, waste: 0 }, 'Volume in cubic feet') / FT3, Math.PI, 'column');
assert.strictEqual(get('concrete-column-calculator', { D: inch(10), H: ft(3), P: inch(3.5), N: 1, waste: 0.1 }, '80 lb bags'), 3);

const block = { L: ft(20), H: ft(4), B: 0, waste: 0.05 };
assert.strictEqual(get('concrete-block-calculator', block, 'Blocks needed'), 95);
assert.strictEqual(get('concrete-block-calculator', block, '80 lb bags of mortar mix'), 8); // 13 blocks per bag
// Brick sizes are menu indexes: 0 US modular, 1 US standard, 2 UK / metric.
const brick = { L: ft(20), H: ft(4), B: 0, layers: 1, waste: 0.05 };
assert.strictEqual(get('brick-calculator', { L: ft(10), H: ft(10), B: 0, layers: 1, waste: 0 }, 'Bricks needed'), 675);
assert.strictEqual(get('brick-calculator', brick, 'Bricks needed'), 567);
assert.strictEqual(get('brick-calculator', { ...brick, layers: 2 }, 'Bricks needed'), 1134);
near(get('brick-calculator', brick, 'Bricks per sq ft'), 6.75, 'modular bricks per sq ft');
assert.strictEqual(get('brick-calculator', brick, '80 lb bags of mortar mix'), 16); // 567 bricks at 37 per bag
assert.strictEqual(get('brick-calculator', brick, 'Pallets (about 500 bricks)'), 2);
const ukBrick = { L: 10, H: 1, B: 2, layers: 1, waste: 0 }; // 10 m² of wall
near(get('brick-calculator', ukBrick, 'Bricks per m²', null, 'met'), 59.26, 'UK bricks per m²');
assert.strictEqual(get('brick-calculator', ukBrick, 'Bricks needed', null, 'met'), 593);
assert.strictEqual(get('brick-calculator', ukBrick, '25 kg bags of mortar mix', null, 'met'), 28); // about 1.18 kg (21 per bag)

near(get('gravel-calculator', { L: ft(10), W: ft(10), D: inch(3), waste: 0 }, 'Volume needed', 'vol') / YD3, 0.926, 'gravel');
const soil = { L: ft(10), W: ft(10), D: inch(4), waste: 0.05 }; // 35 cu ft
near(get('topsoil-calculator', soil, 'Volume needed', 'vol') / YD3, 1.296, 'topsoil cu yd');
near(get('topsoil-calculator', soil, 'Approximate weight') / 907.18474, 1.42, 'topsoil tons');
assert.strictEqual(get('topsoil-calculator', soil, '0.75 cu ft bags (often 40 lb)'), 47);
assert.strictEqual(get('topsoil-calculator', soil, '1 cu ft bags'), 35);
near(get('topsoil-calculator', { ...soil, waste: 0 }, 'Area 1 ton covers') / FT2, 73.93, 'sq ft per ton at 4 in');
near(get('topsoil-calculator', { L: 1, W: 1, D: 0.1, waste: 0 }, 'Area 1 tonne covers', null, 'met'), 7.69, 'm² per tonne at 10 cm');
assert.strictEqual(get('topsoil-calculator', { L: 3, W: 3, D: 0.1, waste: 0.05 }, 'Bulk bags (about 1 tonne)', null, 'met'), 2);
assert.strictEqual(get('mulch-calculator', { L: ft(10), W: ft(10), D: inch(3), waste: 0.05 }, '2 cu ft bags'), 14);
const paver = { L: ft(10), W: ft(10), PL: inch(8), PW: inch(4), gap: 0, base: inch(4), sand: inch(1), waste: 0 };
assert.strictEqual(get('paver-calculator', paver, 'Pavers needed'), 450);
assert.strictEqual(get('paver-calculator', { ...paver, gap: inch(0.125) }, 'Pavers needed'), 430);
near(get('paver-calculator', paver, 'Pavers per sq ft'), 4.5, 'pavers per sq ft');
near(get('paver-calculator', paver, 'Gravel base') / FT3, 40, 'paver base cu ft (+20%)');
assert.strictEqual(get('paver-calculator', paver, '0.5 cu ft bags of sand'), 19);

const sod = { L: ft(20), W: ft(25), waste: 0.05 };
assert.strictEqual(get('sod-calculator', sod, 'Pieces (2 × 5 ft)'), 53);
assert.strictEqual(get('sod-calculator', sod, 'Pallets (about 450 sq ft)'), 2);

const fence = { L: ft(100), S: ft(8), R: 2 };
assert.strictEqual(get('fence-calculator', fence, 'Posts'), 14);
assert.strictEqual(get('fence-calculator', fence, 'Rails'), 26);

const paint = { mode: 0, L: ft(12), W: ft(12), H: ft(8), A: 0, doors: 1, windows: 2, coats: 2, ceil: 0, cov: 350 * FT2 / GAL };
near(get('paint-calculator', paint, 'Area to paint') / FT2, 334, 'paint area');
near(get('paint-calculator', paint, 'Paint needed') / GAL, 1.909, 'paint gallons');
assert.strictEqual(get('paint-calculator', paint, '1 gallon cans'), 2);

const tile = { L: ft(10), W: ft(10), TL: inch(12), TW: inch(12), box: 10, waste: 0.1 };
assert.strictEqual(get('tile-calculator', tile, 'Tiles needed'), 110);
assert.strictEqual(get('tile-calculator', tile, 'Boxes'), 11);
const floor = { L: ft(12), W: ft(15), L2: 0, W2: 0, box: 20 * FT2, waste: 0.1 };
assert.strictEqual(get('flooring-calculator', floor, 'Boxes'), 10);
assert.strictEqual(get('flooring-calculator', { ...floor, L2: ft(5), W2: ft(6) }, 'Boxes'), 12);
assert.strictEqual(get('flooring-calculator', { ...floor, L2: ft(5), W2: ft(6) }, 'Underlayment rolls (100 sq ft)'), 3);

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
const sqft = { shape: 0, L: ft(12), W: ft(15), L2: ft(8), W2: ft(6), D: ft(10), B: ft(10), TH: ft(8) };
near(get('square-footage-calculator', sqft, 'Area') / FT2, 180, 'square feet');
near(get('square-footage-calculator', sqft, 'Area in square yards'), 20, 'square yards');
near(get('square-footage-calculator', { ...sqft, shape: 1 }, 'Area') / FT2, 228, 'L-shape');
near(get('square-footage-calculator', { ...sqft, shape: 2 }, 'Area') / FT2, 78.54, 'circle');
near(get('square-footage-calculator', { ...sqft, shape: 3 }, 'Area') / FT2, 40, 'triangle');

// Concrete shapes and ready-mix
near(get('concrete-calculator', { shape: 1, D: ft(10), T: inch(4), waste: 0 }, 'Volume in cubic feet') / FT3, 26.18, 'round slab');
near(get('concrete-calculator', { shape: 2, W: ft(4), RUN: inch(11), R: inch(7), N: 3, waste: 0 }, 'Volume in cubic feet') / FT3, 12.83, 'steps');
near(get('concrete-calculator', slab, 'Ready-mix to order (rounded up to ¼)') / YD3, 1.5, 'ready-mix order');

// Mortar: 13 US blocks per 80 lb bag; UK blocks 12 per 25 kg bag, mixed 15% cement by weight
assert.strictEqual(get('mortar-calculator', { L: ft(20), H: ft(4), U: 3, layers: 1, waste: 0 }, '80 lb bags of mortar mix'), 7);
const ukBlock = { L: 10, H: 1, U: 4, layers: 1, waste: 0 }; // 99 blocks
assert.strictEqual(get('mortar-calculator', ukBlock, '25 kg bags of mortar mix', null, 'met'), 9);
assert.strictEqual(get('mortar-calculator', ukBlock, 'Or mix your own: 25 kg bags of cement', null, 'met'), 2);

const rwall = { L: ft(20), H: ft(2), BL: inch(12), BH: inch(4), BD: inch(7), CL: inch(12), waste: 0.05 };
assert.strictEqual(get('retaining-wall-calculator', rwall, 'Courses (1 buried)'), 7);
assert.strictEqual(get('retaining-wall-calculator', rwall, 'Wall blocks'), 147);
assert.strictEqual(get('retaining-wall-calculator', rwall, 'Cap blocks'), 21);
near(get('retaining-wall-calculator', rwall, 'Gravel (base + drainage)') / FT3, 75, 'retaining wall gravel');
assert.strictEqual(get('retaining-wall-calculator', { ...rwall, CL: 0 }, 'Cap blocks'), 0);

const rebar = { L: ft(20), W: ft(20), S: inch(12), E: inch(3), size: 1, BL: ft(20), waste: 0.05 };
assert.strictEqual(get('rebar-calculator', rebar, 'Bars to buy'), 41);
near(get('rebar-calculator', rebar, 'Total rebar length') / FT, 780, 'rebar length');
assert.strictEqual(get('rebar-calculator', rebar, 'Tie points'), 400);
near(get('rebar-calculator', rebar, 'Weight') / 0.45359237, 521.04, 'rebar lb'); // #4 is 0.668 lb/ft
// 49.5 ft runs need 2 splices of 40 × ½ in = 20 in each
assert.strictEqual(get('rebar-calculator', { ...rebar, L: ft(50), W: ft(10), waste: 0 }, 'Bars to buy'), 51);

assert.strictEqual(get('sand-calculator', { L: ft(10), W: ft(10), D: inch(2), waste: 0.05 }, '0.5 cu ft bags (about 50 lb)'), 35);
near(get('cubic-yard-calculator', { mode: 2, T: 907.18474, mat: 1 }, 'Volume') / YD3, 0.706, '1 ton of gravel in yards');
near(get('cubic-yard-calculator', { mode: 1, V: YD3, mat: 0 }, 'Weight') / 907.18474, 1.096, '1 yard of topsoil in tons');

const house = { mode: 1, L: ft(40), W: ft(30), H: ft(9), A: 0, doors: 2, windows: 8, coats: 2, ceil: 1, cov: 300 * FT2 / GAL };
near(get('paint-calculator', house, 'Area to paint') / FT2, 1100, 'house exterior area (no ceiling)');
assert.strictEqual(get('paint-calculator', house, '1 gallon cans'), 8);
assert.strictEqual(get('paint-calculator', { ...house, mode: 2, A: 1500 * FT2, coats: 1, cov: 350 * FT2 / GAL }, '1 gallon cans'), 5);

const insul = { L: ft(30), W: ft(20), type: 2, R: 38, cov: 40 * FT2, waste: 0.05 };
assert.strictEqual(get('insulation-calculator', insul, 'Bags'), 16);
near(get('insulation-calculator', insul, 'Thickness needed') / IN, 10.56, 'cellulose R-38 thickness');

assert.strictEqual(get('roofing-calculator', roof, 'Drip edge (10 ft pieces)'), 17);
assert.strictEqual(get('roofing-calculator', roof, 'Ridge cap bundles (about 25 ft each)'), 2);
assert.strictEqual(get('roofing-calculator', roof, 'Underlayment rolls (10 squares each)'), 2);
near(get('stair-calculator', stairs, 'Stair angle (degrees)'), 37.65, 'stair angle');

const frame = { L: ft(12), S: inch(16), C: 2, O: 1, plates: 3, PL: ft(16), waste: 0.1 };
assert.strictEqual(get('framing-calculator', frame, 'Studs'), 18);
assert.strictEqual(get('framing-calculator', frame, 'Plate boards'), 3);
const siding = { L: ft(40), W: ft(30), H: ft(9), G: ft(6), doors: 2, windows: 8, waste: 0.1 };
near(get('siding-calculator', siding, 'Wall area') / FT2, 1280, 'siding area');
assert.strictEqual(get('siding-calculator', siding, 'Vinyl siding boxes (2 squares each)'), 8);

// Every calculator has an article, and its defaults give finite results in both unit systems.
for (const c of CALCS) {
  assert(fs.existsSync(`content/${c.slug}.html`), `missing content/${c.slug}.html`);
  const v = Object.fromEntries(c.inputs.map(([id, , k, def, opts]) => [id, k === 'select' ? opts[def][1] : UNITS[k] ? def * UNITS[k][0][1] : k === 'pct' ? def / 100 : def]));
  for (const sys of ['imp', 'met']) for (const [l, b] of c.compute(v, sys)) assert(Number.isFinite(b), `${c.slug} ${sys} "${l}" is ${b}`);
  for (const [id] of c.inputs) assert(c.tips[id], `${c.slug}: no tip for input "${id}"`);
  if (c.head) for (const sys of ['imp', 'met']) assert(c.compute(v, sys).some(r => [].concat(c.head).includes(r[0])), `${c.slug}: headline "${c.head}" matches no ${sys} row`);
  // Every option of every menu gives finite results, so each shape or mode works.
  for (const [id, , k, , opts] of c.inputs) if (k === 'select') for (const [, val] of opts)
    for (const sys of ['imp', 'met']) for (const [l, b] of c.compute({ ...v, [id]: val }, sys)) assert(Number.isFinite(b), `${c.slug} ${id}=${val} ${sys} "${l}" is ${b}`);
  for (const id of Object.keys(c.show || {})) assert(c.inputs.some(i => i[0] === id) && c.inputs.some(i => i[0] === c.show[id][0]), `${c.slug}: show rule for "${id}" names a missing input`);
  // Every price matches a result row, and each unit system that shows the row has a default price for it.
  for (const [label, p] of Object.entries(c.prices || {})) {
    const shown = ['imp', 'met'].filter(sys => c.compute(v, sys).some(r => r[0] === label));
    assert(shown.length, `${c.slug}: price "${label}" matches no result row`);
    for (const sys of shown) assert(p[sys === 'imp' ? 0 : 1] > 0, `${c.slug}: no ${sys} price for "${label}"`);
  }
}

console.log(`All formula checks passed for ${CALCS.length} calculators.`);
