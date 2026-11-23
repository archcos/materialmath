// Checks every formula against a hand-worked answer (the same examples the articles use). Run: node test.js
const assert = require('assert');
const fs = require('fs');
const { CALCS, UNITS, frac: MMfrac } = require('./src/formulas.js');

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

// Wood joints in a 1×4 (¾ × 3½ in), as in the article. Joint menu positions: 0 butt … 7 mortise and tenon … 10 miter.
const JC = CALCS.find(c => c.slug === 'wood-joint-calculator'), joint = (j, x = {}, sys = 'imp') => Object.fromEntries(JC.compute({ joint: j, T: inch(0.75), W: inch(3.5), sides: 4, ...x }, sys));
const mt = joint(7);
near(mt['Tenon thickness'] / IN, 0.25, 'tenon ⅓ of ¾ in');
near(mt['Tenon width'] / IN, 3, 'tenon width');
near(mt['Mortise depth'] / IN, 7 / 3 + 1 / 16, 'mortise depth');
near(joint(7, {}, 'met')['Tenon thickness'], 0.006, '18 mm stock takes a 6 mm tenon');
near(joint(2)['Dowel diameter'] / IN, 0.375, 'dowel ½ of ¾ in');
assert.strictEqual(joint(2)['Dowels per joint'], 2);
near(joint(1)['Pocket screw length'] / IN, 1.25, 'Kreg: 1¼ in screws for ¾ in stock');
near(joint(1, { T: inch(1.5) })['Pocket screw length'] / IN, 2.5, 'Kreg: 2½ in screws for 1½ in stock');
assert.strictEqual(joint(3)['Biscuit size (#0, #10 or #20)'], 20);
near(joint(4)['Dado depth (⅓ of the board)'] / IN, 0.25, 'dado depth');
assert.strictEqual(joint(8)['Fingers across the joint (both boards)'], 9); // 3½ ÷ ⅜ = 9.3, nearest odd 9
near(joint(8)['Board width for full fingers at both edges'] / IN, 3.375, 'box joint width');
near(joint(9)['Angle for hardwood (1:8 slope, degrees)'], 7.125, 'dovetail 1:8');
near(joint(10)['Saw angle (degrees from square)'], 45, 'square frame miter');
near(joint(10, { sides: 8 })['Saw angle (degrees from square)'], 22.5, 'octagon miter');
near(joint(10)['Long point minus short point'] / IN, 7, 'miter long point');
// Every joint's first row is its headline, so the big number on the page is the right one.
JC.inputs[0][4].forEach(([, j]) => assert(JC.head.includes(JC.compute({ joint: j, T: inch(0.75), W: inch(3.5), sides: 4 }, 'imp')[0][0]), `joint ${j}: first row is not in head`));
assert.strictEqual(MMfrac(2.3125), '2 5/16');
assert.strictEqual(MMfrac(0.75), '3/4');
assert.strictEqual(MMfrac(4), '4');

// Cut list: the bookshelf from the article. Longest first; two 46 in sides share a board; ⅛ in kerf, ½ in trim.
const shelf = { SL: ft(8), kerf: inch(0.125), trim: inch(0.5), A: inch(46), nA: 2, B: inch(30), nB: 4, C: inch(32), nC: 1, D: inch(28.5), nD: 1, waste: 0.1 };
assert.strictEqual(get('cut-list-calculator', shelf, 'Boards the cuts fit on'), 3);
assert.strictEqual(get('cut-list-calculator', shelf, 'Boards to buy'), 4);
near(get('cut-list-calculator', shelf, 'Offcuts left over') / IN, 13, 'offcuts');
near(get('cut-list-calculator', shelf, 'Lost to saw kerf') / IN, 1, 'kerf');
// 47¾ in sides no longer share a board (95⅝ in > 95½ in), so 4 boards, though the lengths add up to under 3.
assert.strictEqual(get('cut-list-calculator', { ...shelf, A: inch(47.75) }, 'Boards the cuts fit on'), 4);
// A piece that exactly fills a board needs no kerf after it; one too long is reported, not counted.
assert.strictEqual(get('cut-list-calculator', { ...shelf, trim: 0, A: ft(8), nA: 2, nB: 0, nC: 0, nD: 0 }, 'Boards the cuts fit on'), 2);
assert.strictEqual(get('cut-list-calculator', { ...shelf, A: ft(9), nA: 1, nB: 0, nC: 0, nD: 0 }, 'Pieces longer than the board (not counted)'), 1);
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

// House: each part comes from its own calculator. Small house 24 × 36 ft, 8 ft walls, 6/12, 96 ft of inside walls.
const home = { L: ft(36), W: ft(24), stories: 1, H: ft(8), roof: 0, pitch: Math.sqrt(1.25), over: inch(12), walls: 4, spacing: 16, I: ft(96), doors: 2, gdoors: 0, idoors: 6, windows: 8, fin: 1 };
near(get('house-material-calculator', home, 'Concrete: ready-mix to order') / YD3, 15, 'house concrete (4 in slab + thickened edge, +10%, ¼ yd steps)');
assert.strictEqual(get('house-material-calculator', home, 'Wall studs (2×4)'), 243);
assert.strictEqual(get('house-material-calculator', home, 'Roof trusses (about 2 ft apart)'), 19);
assert.strictEqual(get('house-material-calculator', home, 'Drywall sheets'), 116); // (960 + 864 + 1,536 sq ft) × 1.1 ÷ 32
assert.strictEqual(get('house-material-calculator', home, 'Shingle bundles'), 37);
// Two stories: walls and drywall roughly double, the slab and roof stay the same, and upper-floor joists appear.
const two = { ...home, stories: 2 };
assert.strictEqual(get('house-material-calculator', two, 'Wall studs (2×4)'), 355); // outside walls doubled; the 96 ft of inside walls split over two floors
assert.strictEqual(get('house-material-calculator', { ...home, walls: 6, spacing: 24 }, 'Wall studs (2×6)'), 183);
near(get('house-material-calculator', two, 'Concrete: ready-mix to order') / YD3, 15, 'same slab for two stories');
assert(get('house-material-calculator', two, 'Floor joists, upper floor (2×10, 16 ft)') > 0);
// Hip roof: no gables, so less siding; more ridge cap for the hips.
assert(get('house-material-calculator', { ...home, roof: 1 }, 'Siding: vinyl') < get('house-material-calculator', home, 'Siding: vinyl'), 'hip roof has no gable siding');
assert(get('house-material-calculator', { ...home, roof: 1 }, 'Ridge cap bundles') > get('house-material-calculator', home, 'Ridge cap bundles'), 'hips need ridge cap');
assert(get('house-material-calculator', { ...home, walls: 6 }, 'Wall insulation bags (R-21 batts)') > 0);
const shell = CALCS.find(c => c.slug === 'house-material-calculator').compute({ ...home, fin: 0 }, 'imp');
assert(!shell.some(r => r[0] === 'Drywall sheets'), 'an unfinished shell has no drywall');
// A taller upper floor: more siding and drywall than two equal stories, same framing count.
const tall = { ...two, H2: ft(10) };
assert(get('house-material-calculator', tall, 'Siding: vinyl') > get('house-material-calculator', two, 'Siding: vinyl'));
assert(get('house-material-calculator', tall, 'Drywall sheets') > get('house-material-calculator', two, 'Drywall sheets'));
// Block walls: (960 − 40 − 120) + (768 − 120) = 1,448 sq ft of wall ÷ 0.889 sq ft per block × 1.05 = 1,711 blocks, 13 per bag.
const blockHouse = { ...home, walls: 8 }, rowsOf = x => Object.fromEntries(CALCS.find(c => c.slug === 'house-material-calculator').compute(x, 'imp'));
assert.strictEqual(get('house-material-calculator', blockHouse, 'Concrete blocks (16 × 8 in face)'), 1711);
assert.strictEqual(get('house-material-calculator', blockHouse, '80 lb bags of mortar mix'), 132);
assert(!('Wall studs (2×4)' in rowsOf(blockHouse)) && !('Wall insulation bags (R-13 batts)' in rowsOf(blockHouse)), 'block walls: no studs or batts');
assert('Roof sheathing (4 × 8 sheets)' in rowsOf(blockHouse) && rowsOf(blockHouse)['Stucco or render, inside walls (80 lb bags)'] > 0);
assert(rowsOf(blockHouse)['Drywall sheets'] < rowsOf(home)['Drywall sheets'], 'block walls: drywall on the ceilings only');
// Roofing: metal panels on a 38 ft gable roof, 3 ft each, both sides = 26; tiles about 90 per square.
assert.strictEqual(get('house-material-calculator', { ...home, roofing: 1 }, 'Metal roof panels (3 ft wide)'), 26);
near(get('house-material-calculator', { ...home, roofing: 2 }, 'Roof tiles') / (get('house-material-calculator', home, 'Roofing squares') * 90), 1, 'tiles per square');
assert(!('Shingle bundles' in rowsOf({ ...home, roofing: 1 })));
// Outside finish: render about 11 sq ft per 80 lb bag; brick veneer about 6.75 bricks per sq ft, with mortar.
const wall = rowsOf(home)['Siding: vinyl'] / 1.1 / FT2;
near(rowsOf({ ...home, siding: 2 })['Stucco or render, outside walls (80 lb bags)'], Math.ceil((wall * 1.05) / 10.68), 'render bags');
near(rowsOf({ ...home, siding: 3 })['Bricks for the veneer'], Math.ceil(wall * 6.75 * 1.05), 'veneer bricks');
assert(rowsOf({ ...home, siding: 3 })['80 lb bags of mortar mix'] > 0);
// Nails, screws and small items (extras on): shingles take 320 nails a square at 140 per lb, in 5 lb boxes;
// two hurricane ties per truss; block walls get wall plugs and no framing nails or house wrap; "Leave them out" drops them all.
const ex = rowsOf({ ...home, extras: 1 });
assert.strictEqual(ex['Nails: 1¼ in roofing (5 lb boxes)'], Math.ceil((ex['Roofing squares'] * 320) / 140 / 5));
assert.strictEqual(ex['Hurricane ties (2 per truss)'], 2 * ex['Roof trusses (about 2 ft apart)']);
assert.strictEqual(ex['Drywall screws (boxes of 1,000)'], Math.ceil((ex['Drywall sheets'] * 32) / 1000));
assert(ex['Nails: 16d framing (5 lb boxes)'] > 0 && ex['House wrap (9 × 100 ft rolls)'] > 0 && ex['Anchor bolts (½ × 10 in)'] > 0);
const exBlock = rowsOf({ ...home, walls: 8, extras: 1 });
assert(exBlock['Wall plugs (tox) with screws (packs of 100)'] > 0 && !('Nails: 16d framing (5 lb boxes)' in exBlock) && !('House wrap (9 × 100 ft rolls)' in exBlock));
assert(rowsOf({ ...home, roofing: 1, extras: 1 })['Metal roofing screws (bags of 250)'] > 0);
assert(!Object.keys(rowsOf({ ...home, extras: 0 })).some(l => /^Nails|screws|Hurricane|Caulk/.test(l)), 'small items left out');
// Flooring: tile adds thinset, one 50 lb bag per 95 sq ft.
assert.strictEqual(rowsOf({ ...home, floor: 1 })['Tile adhesive (50 lb bags)'], Math.ceil((864 * 1.1) / 95));
// Sample builds name real fields, and their menu positions exist.
for (const c of CALCS) for (const [name, vals] of c.presets || []) for (const [id, val] of Object.entries(vals)) {
  const input = c.inputs.find(i => i[0] === id);
  assert(input, `${c.slug} sample "${name}": no field "${id}"`);
  if (input[2] === 'select') assert(input[4][val], `${c.slug} sample "${name}": no option ${val} for "${id}"`);
}

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
  // Every price matches a result row (for the defaults or some menu choice, as calc-ui.js checks),
  // and each unit system that shows the row has a default price for it.
  const variants = [v, ...c.inputs.filter(i => i[2] === 'select').flatMap(([id, , , , opts]) => opts.map(o => ({ ...v, [id]: o[1] })))];
  for (const [label, p] of Object.entries(c.prices || {})) {
    const shown = ['imp', 'met'].filter(sys => variants.some(x => c.compute(x, sys).some(r => r[0] === label)));
    assert(shown.length, `${c.slug}: price "${label}" matches no result row`);
    for (const sys of shown) assert(p[sys === 'imp' ? 0 : 1] > 0, `${c.slug}: no ${sys} price for "${label}"`);
  }
}

// Every calculator has a live drawing (views.js) that renders in 3D and plan for its defaults and every menu choice.
const MV = require('./src/views.js');
for (const c of CALCS) {
  assert(MV.views[c.slug], `${c.slug}: no 3D/plan view in src/views.js`);
  const v = Object.fromEntries(c.inputs.map(([id, , k, def, opts]) => [id, k === 'select' ? opts[def][1] : UNITS[k] ? def * UNITS[k][0][1] : k === 'pct' ? def / 100 : def]));
  for (const x of [v, ...c.inputs.filter(i => i[2] === 'select').flatMap(([id, , , , opts]) => opts.map(o => ({ ...v, [id]: o[1] })))]) {
    const sc = new MV.Scene();
    MV.views[c.slug](x, sc, { len: b => `${b.toFixed(2)} m` });
    const out = MV.render3d(sc, { yaw: -0.6, elev: 0.5 }) + MV.renderPlan(sc);
    assert(out.length > 100 && !/NaN|Infinity|undefined/.test(out), `${c.slug}: drawing failed for ${JSON.stringify(x)}`);
  }
}

// 3D order: a small box standing on the far corner of a big flat slab is drawn after the slab from every side.
// (Sorting faces by their middle point got this wrong, which broke the floor between two stories.)
{
  const sc = new MV.Scene();
  sc.box(0, 0, 0, 10, 10, 0.3, '#111111');
  sc.box(9, 9, 0.3, 1, 1, 3, '#eeeeee');
  for (let yaw = -3; yaw <= 3; yaw += 0.25) {
    const out = MV.render3d(sc, { yaw, elev: 0.5 }), last = c => Math.max(...[...out.matchAll(/fill="rgb\((\d+),/g)].map((m, i) => (c(+m[1]) ? i : -1)));
    const firstSmall = [...out.matchAll(/fill="rgb\((\d+),/g)].findIndex(m => +m[1] > 100);
    assert(firstSmall > last(r => r < 100), `3D order wrong at yaw ${yaw}`);
  }
}

// House floor plans: the visitor's own plan is counted floor by floor, and the estimate follows it.
{
  const H = CALCS.find(c => c.slug === 'house-material-calculator');
  const v = { L: 36 * FT, W: 24 * FT, stories: 2, H: 8 * FT, roof: 0, pitch: 1.118, over: FT, walls: 4, spacing: 16, I: 0, doors: 0, gdoors: 0, idoors: 0, windows: 0, fin: 1 };
  const plan = { floors: [
    { ext: [[{ kind: 'door', c: 5, w: 0.91 }, { kind: 'window', c: 2, w: 0.9 }, { kind: 'window', c: 5.3, w: 0.9 }], [], [{ kind: 'garage', c: 3, w: 4.88 }], []],
      walls: [{ a: [5, 0], b: [5, 20], items: [{ kind: 'door', c: 3, w: 0.81 }] }, { a: [0, 4], b: [5, 4], items: [] }], rooms: [{ at: [2, 2], name: 'Den' }] },
    { ext: [[{ kind: 'window', c: 3, w: 0.9 }], [], [], []], walls: [], rooms: [] }] };
  const per = MV.house.counts(v, plan);
  // the window at 5.3 overlaps the door at 5 and is left out; the 16 ft garage door fits the 24 ft end wall
  assert.deepStrictEqual(per.map(c => [c.doors, c.gdoors, c.windows, c.idoors]), [[1, 1, 1, 1], [0, 0, 1, 0]]);
  // inside walls: one across the width, stopped at the outside walls (7.315 - 2 × 0.14), and one stopped at its face (5 - 0.05 - 0.14)
  near(per[0].I, (24 * FT - 0.28) + (5 - 0.05 - 0.14), 'drawn inside wall length');
  assert.strictEqual(per[1].I, 0);
  const rows = p => Object.fromEntries(H.compute({ ...v, I: per[0].I, doors: 1, gdoors: 1, idoors: 1, windows: 2, plan: p }, 'imp'));
  assert(rows(per)['Wall studs (2×4)'] !== rows(undefined)['Wall studs (2×4)'], 'the drawn plan changes the framing');
  assert(rows(per)['Drywall sheets'] > 0);
  // the sample plan counts what it draws, and every floor of a sample renders from its plan
  for (const [, p] of H.presets) {
    const x = Object.fromEntries(H.inputs.map(([id, , k, def, opts]) => { const d = id in p ? p[id] : def; return [id, k === 'select' ? opts[d][1] : UNITS[k] ? d * UNITS[k][0][1] : d]; }));
    const sp = MV.house.sample(x), c = MV.house.counts(x, sp);
    assert.strictEqual(sp.floors.length, x.stories);
    assert(c.reduce((s, f) => s + f.doors + f.gdoors, 0) <= x.doors + x.gdoors);
    for (const floor of [0, 1]) {
      const sc = new MV.Scene();
      MV.views[H.slug](x, sc, { len: String, plan: sp, floor });
      assert(MV.renderPlan(sc).length > 100 && MV.render3d(sc, { yaw: 1, elev: 0.4 }).length > 100);
    }
  }
}

console.log(`All formula checks passed for ${CALCS.length} calculators.`);
