// Calculator definitions, shared by the browser (calc-ui.js), build.js and test.js.
// Inputs are [id, label, kind, imperialDefault, selectOptions?].
// compute(v, sys) receives values already converted to metric base units (m, m², kg; % as a fraction)
// and returns rows of [label, baseValue, kind]; calc-ui.js formats them for the chosen unit system.
(function (root) {
  const FT = 0.3048, IN = 0.0254, FT2 = FT * FT, FT3 = FT2 * FT, GAL = 0.003785411784;

  // kind -> [[imperial label, factor to base], [metric label, factor to base]]
  const UNITS = {
    len: [['ft', FT], ['m', 1]],
    small: [['in', IN], ['cm', 0.01]],
    area: [['sq ft', FT2], ['m²', 1]],
    vol: [['cu yd', 27 * FT3], ['m³', 1]],
    cuft: [['cu ft', FT3], ['m³', 1]],
    liq: [['gal', GAL], ['L', 0.001]],
    ton: [['tons', 907.18474], ['tonnes', 1000]],
    wt: [['lb', 0.45359237], ['kg', 1]],
  };

  const CATS = {
    concrete: 'Concrete & Masonry',
    landscape: 'Landscaping & Yard',
    interior: 'Interior & Finishing',
    build: 'Building & Carpentry',
  };

  const up = x => Math.ceil(x - 1e-9); // float noise: 675.0000001 must stay 675
  const imp = sys => sys === 'imp';
  const volRows = (V, sys) => [['Volume needed', V, 'vol'], ...(imp(sys) ? [['Volume in cubic feet', V, 'cuft']] : [])];

  // Premix concrete: an 80 lb bag yields about 0.6 cu ft; metric bags are scaled by weight.
  const BAG_M3_PER_KG = (0.6 * FT3) / (80 * 0.45359237);
  const bags = (V, sys) => imp(sys)
    ? [['80 lb bags', up(V / (0.6 * FT3)), 'count'], ['60 lb bags', up(V / (0.45 * FT3)), 'count'], ['40 lb bags', up(V / (0.3 * FT3)), 'count']]
    : [['25 kg bags', up(V / (25 * BAG_M3_PER_KG)), 'count'], ['20 kg bags', up(V / (20 * BAG_M3_PER_KG)), 'count']];

  const bulkInputs = depth => [['L', 'Area length', 'len', 10], ['W', 'Area width', 'len', 10], ['D', 'Depth', 'small', depth], ['waste', 'Extra for settling', 'pct', 5]];
  const bulkVol = v => v.L * v.W * v.D * (1 + v.waste);
  // density in tonnes per m³
  const bulk = density => (v, sys) => { const V = bulkVol(v); return [...volRows(V, sys), ['Approximate weight', V * density * 1000, 'ton']]; };

  const LB = 0.45359237;
  // Bricks and blocks: [menu label, face area with joint (m²), dry premixed mortar per unit (kg)].
  // Bricks: Quikrete's data sheet says an 80 lb bag lays up to 37 standard bricks. Other bricks scale by their
  // joint volume ((face with joint − brick face) × depth), which gives about 21 UK bricks per 25 kg bag
  // (UK makers quote 20–25). Blocks: 13 per 80 lb bag (Quikrete), about 12 UK 100 mm blocks per 25 kg bag (Cemex).
  const jointVol = (l, h, L, H, d) => (L * H - l * h) * d;
  const KG_PER_JOINT_M3 = (80 * LB) / 37 / (jointVol(7.625, 2.25, 8, 8 / 3, 3.625) * IN ** 3);
  const MASONRY = [
    ['US modular brick (7⅝ × 2¼ in)', 8 * (8 / 3) * IN * IN, jointVol(7.625, 2.25, 8, 8 / 3, 3.625) * IN ** 3 * KG_PER_JOINT_M3],
    ['US standard brick (8 × 2¼ in)', 8.375 * 2.625 * IN * IN, jointVol(8, 2.25, 8.375, 2.625, 3.75) * IN ** 3 * KG_PER_JOINT_M3],
    ['UK / metric brick (215 × 65 mm)', 0.225 * 0.075, jointVol(0.215, 0.065, 0.225, 0.075, 0.1025) * KG_PER_JOINT_M3],
    ['US concrete block (16 × 8 in face)', 16 * 8 * IN * IN, (80 * LB) / 13],
    ['UK / metric block (440 × 215 mm)', 0.45 * 0.225, 25 / 12],
  ];
  const BRICKS = MASONRY.slice(0, 3);
  const BRICKS_PER_PALLET = 500;
  const mortarBags = (kg, sys) => imp(sys) ? ['80 lb bags of mortar mix', up(kg / (80 * LB)), 'count'] : ['25 kg bags of mortar mix', up(kg / 25), 'count'];
  const perArea = (what, perM2, sys) => imp(sys) ? [`${what} per sq ft`, perM2 * FT2, 'num'] : [`${what} per m²`, perM2, 'num'];

  // Bulk materials for the cubic yard calculator: [menu label, tonnes per m³].
  const MATERIALS = [
    ['Topsoil or dirt (1.1 tons/yd³ · 1.3 t/m³)', 1.3],
    ['Gravel or crushed stone (1.4 tons/yd³ · 1.68 t/m³)', 1.68],
    ['Sand (1.35 tons/yd³ · 1.6 t/m³)', 1.6],
    ['Mulch (0.3 tons/yd³ · 0.36 t/m³)', 0.36],
    ['Concrete (2 tons/yd³ · 2.4 t/m³)', 2.4],
  ];
  // Rebar: [menu label, bar diameter (m), kg per metre]. US weights are ASTM A615 (lb/ft × 1.48816).
  const REBAR = [
    ['#3 (⅜ in)', 0.375 * IN, 0.376 * 1.48816], ['#4 (½ in)', 0.5 * IN, 0.668 * 1.48816], ['#5 (⅝ in)', 0.625 * IN, 1.043 * 1.48816],
    ['10 mm', 0.01, 0.617], ['12 mm', 0.012, 0.888], ['16 mm', 0.016, 1.578],
  ];
  // Insulation: [menu label, R-value per inch (US units)].
  const INSULATION = [['Batts or rolls (fiberglass, mineral wool)', 3.2], ['Blown-in fiberglass', 2.5], ['Blown-in cellulose', 3.6]];

  const yesNo = [['No', 0], ['Yes', 1]];
  const pitches = Array.from({ length: 13 }, (_, r) => [r ? `${r}/12` : 'Flat (0/12)', Math.sqrt(1 + (r / 12) ** 2)]);

  const CALCS = [
    {
      slug: 'concrete-calculator', cat: 'concrete', title: 'Concrete Calculator',
      desc: 'Work out how much concrete you need for a slab, patio, footing, round pad or steps, in cubic yards or m³, plus premix bags and ready-mix truck loads.',
      inputs: [['shape', 'Shape', 'select', 0, [['Slab, patio or footing', 0], ['Round slab', 1], ['Steps', 2]]],
        ['L', 'Length', 'len', 10], ['W', 'Width', 'len', 10], ['D', 'Diameter', 'len', 10], ['T', 'Thickness', 'small', 4],
        ['N', 'Number of steps', 'count', 3], ['R', 'Step height (rise)', 'small', 7], ['RUN', 'Step depth (tread)', 'small', 11],
        ['waste', 'Extra for waste', 'pct', 10]],
      show: { L: ['shape', [0]], W: ['shape', [0, 2]], D: ['shape', [1]], T: ['shape', [0, 1]], N: ['shape', [2]], R: ['shape', [2]], RUN: ['shape', [2]] },
      compute(v, sys) {
        // Solid steps: step i (from the bottom) is i risers tall, so the stack holds n(n+1)/2 rise × tread blocks.
        const V0 = v.shape === 1 ? Math.PI * (v.D / 2) ** 2 * v.T : v.shape === 2 ? v.W * v.RUN * v.R * v.N * (v.N + 1) / 2 : v.L * v.W * v.T;
        const V = V0 * (1 + v.waste), step = imp(sys) ? 0.25 * 27 * FT3 : 0.25, truck = imp(sys) ? 10 * 27 * FT3 : 6;
        return [...volRows(V, sys), ['Ready-mix to order (rounded up to ¼)', up(V / step) * step, 'vol'], ...bags(V, sys),
          [imp(sys) ? 'Ready-mix trucks (about 10 cu yd each)' : 'Ready-mix trucks (about 6 m³ each)', up(V / truck), 'count']];
      },
    },
    {
      slug: 'concrete-column-calculator', cat: 'concrete', title: 'Post Hole & Concrete Column Calculator',
      desc: 'Estimate concrete for fence post holes, round columns and tube forms, with the volume of the post taken out.',
      inputs: [['D', 'Hole or form diameter', 'small', 10], ['H', 'Hole depth or column height', 'len', 3], ['P', 'Post width (0 for a solid column)', 'small', 3.5], ['N', 'Number of holes', 'count', 1], ['waste', 'Extra for waste', 'pct', 10]],
      compute(v, sys) {
        const V = Math.max(0, Math.PI * (v.D / 2) ** 2 - v.P ** 2) * v.H * v.N * (1 + v.waste);
        return [...volRows(V, sys), ...bags(V, sys)];
      },
    },
    {
      slug: 'concrete-block-calculator', cat: 'concrete', title: 'Concrete Block Calculator',
      desc: 'Count the concrete blocks (CMU or cinder blocks) and bags of mortar for a wall from its length and height, for 4, 6, 8, 10 or 12 in block.',
      inputs: [['L', 'Wall length', 'len', 20], ['H', 'Wall height', 'len', 4],
        ['B', 'Block size', 'select', 0, [['16 × 8 in face (4, 6, 8, 10 or 12 in wide)', 0], ['440 × 215 mm face (UK / metric)', 1]]],
        ['waste', 'Extra for breakage and cuts', 'pct', 5]],
      compute(v, sys) {
        const [, face, kg] = MASONRY[3 + v.B], A = v.L * v.H, n = up((A / face) * (1 + v.waste));
        return [['Wall area', A, 'area'], ['Blocks needed', n, 'count'], perArea('Blocks', 1 / face, sys), mortarBags(n * kg, sys)];
      },
    },
    {
      slug: 'brick-calculator', cat: 'concrete', title: 'Brick Calculator',
      desc: 'Find how many bricks, bags of mortar and pallets you need for a wall, for US modular, US standard or UK metric bricks.',
      inputs: [['L', 'Wall length', 'len', 20], ['H', 'Wall height', 'len', 4],
        ['B', 'Brick size', 'select', 0, BRICKS.map(([label], n) => [label.replace(' brick', ''), n])],
        ['layers', 'Wall thickness', 'select', 0, [['Single layer (one brick wide)', 1], ['Double layer (two bricks wide)', 2]]],
        ['waste', 'Extra for breakage and cuts', 'pct', 5]],
      compute(v, sys) {
        const [, face, kg] = BRICKS[v.B], A = v.L * v.H, perM2 = v.layers / face, n = up(A * perM2 * (1 + v.waste));
        return [['Wall area', A, 'area'], ['Bricks needed', n, 'count'], perArea('Bricks', perM2, sys), mortarBags(n * kg, sys),
          [`Pallets (about ${BRICKS_PER_PALLET} bricks)`, up(n / BRICKS_PER_PALLET), 'count']];
      },
    },
    {
      slug: 'mortar-calculator', cat: 'concrete', title: 'Mortar Calculator',
      desc: 'Work out how many bags of mortar mix, or how much cement and sand, you need to lay the bricks or blocks for a wall.',
      inputs: [['L', 'Wall length', 'len', 20], ['H', 'Wall height', 'len', 4],
        ['U', 'Brick or block', 'select', 0, MASONRY.map(([label], n) => [label, n])],
        ['layers', 'Wall thickness', 'select', 0, [['Single layer', 1], ['Double layer (two units wide)', 2]]],
        ['waste', 'Extra bricks or blocks for breakage', 'pct', 5]],
      head: ['80 lb bags of mortar mix', '25 kg bags of mortar mix'],
      compute(v, sys) {
        const [, face, kgEach] = MASONRY[v.U], n = up((v.L * v.H * v.layers / face) * (1 + v.waste)), kg = n * kgEach;
        // Mixing your own, by weight: US masonry cement 1 : 3 sand by volume is about 19% cement;
        // UK general-purpose 1 : 5 cement : sand by volume is about 15% cement.
        const c = imp(sys) ? 0.19 : 0.15;
        return [['Bricks or blocks laid', n, 'count'], mortarBags(kg, sys), ['Dry mortar mix weight', kg, 'wt'],
          imp(sys) ? ['Or mix your own: 70 lb bags of masonry cement', up(kg * c / (70 * LB)), 'count'] : ['Or mix your own: 25 kg bags of cement', up(kg * c / 25), 'count'],
          [imp(sys) ? '… plus mason sand' : '… plus building sand', kg * (1 - c), 'ton']];
      },
    },
    {
      slug: 'retaining-wall-calculator', cat: 'concrete', title: 'Retaining Wall Calculator',
      desc: 'Count the retaining wall blocks, cap blocks, base gravel and drainage gravel for a segmental block wall.',
      inputs: [['L', 'Wall length', 'len', 20], ['H', 'Wall height above ground', 'len', 2],
        ['BL', 'Block length', 'small', 12], ['BH', 'Block height', 'small', 4], ['BD', 'Block depth (front to back)', 'small', 7],
        ['CL', 'Cap length (0 for no caps)', 'small', 12], ['waste', 'Extra for cuts and breakage', 'pct', 5]],
      compute(v) {
        // One course is buried below ground. The base trench is 6 in deep and 12 in wider than the block,
        // and 12 in of drainage gravel goes behind the wall; both get 20% extra because gravel compacts.
        const courses = up(v.H / v.BH) + 1, blocks = up((courses * v.L / v.BL) * (1 + v.waste));
        const caps = v.CL ? up((v.L / v.CL) * (1 + v.waste)) : 0;
        const base = v.L * (v.BD + 12 * IN) * 6 * IN * 1.2, drain = v.L * 12 * IN * courses * v.BH * 1.2;
        return [['Courses (1 buried)', courses, 'count'], ['Wall blocks', blocks, 'count'], ['Cap blocks', caps, 'count'],
          ['Gravel (base + drainage)', base + drain, 'vol'], ['Gravel weight', (base + drain) * 1680, 'ton'], ['Perforated drain pipe', v.L, 'len']];
      },
    },
    {
      slug: 'rebar-calculator', cat: 'concrete', title: 'Rebar Calculator',
      desc: 'Work out the rebar for a slab grid: how many bars to buy, total length, weight and tie points, with lap splices included.',
      inputs: [['L', 'Slab length', 'len', 20], ['W', 'Slab width', 'len', 20], ['S', 'Bar spacing (each way)', 'small', 12],
        ['E', 'Edge clearance', 'small', 3], ['size', 'Bar size', 'select', 1, REBAR.map(([label], n) => [label, n])],
        ['BL', 'Bar length', 'len', 20], ['waste', 'Extra for cuts', 'pct', 5]],
      compute(v) {
        const [, d, kgm] = REBAR[v.size], a = Math.max(0, v.L - 2 * v.E), b = Math.max(0, v.W - 2 * v.E), lap = 40 * d;
        const along = Math.floor(b / v.S + 1e-9) + 1, across = Math.floor(a / v.S + 1e-9) + 1;
        // A run longer than one bar needs splices, each overlapping 40 bar diameters.
        const run = len => len + (len > v.BL ? up((len - v.BL) / (v.BL - lap)) * lap : 0);
        const total = along * run(a) + across * run(b);
        return [['Bars to buy', up((total * (1 + v.waste)) / v.BL), 'count'], ['Total rebar length', total, 'len'], ['Weight', total * kgm, 'wt'],
          ['Bars running lengthwise', along, 'count'], ['Bars running widthwise', across, 'count'], ['Tie points', along * across, 'count']];
      },
    },
    {
      slug: 'gravel-calculator', cat: 'landscape', title: 'Gravel Calculator',
      desc: 'Calculate gravel or crushed stone for a driveway, path or base, in cubic yards and tons (or m³ and tonnes).',
      inputs: bulkInputs(3), compute: bulk(1.68),
    },
    {
      slug: 'topsoil-calculator', cat: 'landscape', title: 'Topsoil Calculator',
      desc: 'Work out how much topsoil you need for a new lawn, garden bed or raised bed, in cubic yards, tons and bags (or m³, tonnes and bags).',
      inputs: bulkInputs(4), head: 'Volume needed', // bulk yards, not bags, is the main answer
      compute(v, sys) {
        const V = bulkVol(v), kg = V * 1300, ton = UNITS.ton[imp(sys) ? 0 : 1][1];
        return [...volRows(V, sys), ['Approximate weight', kg, 'ton'], ...(imp(sys)
          ? [['0.75 cu ft bags (often 40 lb)', up(V / (0.75 * FT3)), 'count'], ['1 cu ft bags', up(V / FT3), 'count'], ['Area 1 ton covers', ton / 1300 / (v.D * (1 + v.waste)), 'area']]
          : [['25 L bags', up(V / 0.025), 'count'], ['Bulk bags (about 1 tonne)', up(kg / 1000), 'count'], ['Area 1 tonne covers', ton / 1300 / (v.D * (1 + v.waste)), 'area']])];
      },
    },
    {
      slug: 'mulch-calculator', cat: 'landscape', title: 'Mulch Calculator',
      desc: 'Find how many cubic yards or bags of mulch cover your garden beds at the depth you want.',
      inputs: bulkInputs(3),
      compute(v, sys) {
        const V = bulkVol(v);
        return [...volRows(V, sys), imp(sys) ? ['2 cu ft bags', up(V / (2 * FT3)), 'count'] : ['50 L bags', up(V / 0.05), 'count']];
      },
    },
    {
      slug: 'sand-calculator', cat: 'landscape', title: 'Sand Calculator',
      desc: 'Calculate the sand for a paver base, sandbox or leveling job, in cubic yards, tons and bags (or m³, tonnes and bags).',
      inputs: bulkInputs(2), head: 'Volume needed',
      compute(v, sys) {
        const V = bulkVol(v); // sand: about 1.6 tonnes per m³, so a 0.5 cu ft bag is about 50 lb
        return [...volRows(V, sys), ['Approximate weight', V * 1600, 'ton'],
          imp(sys) ? ['0.5 cu ft bags (about 50 lb)', up(V / (0.5 * FT3)), 'count'] : ['25 kg bags', up((V * 1600) / 25), 'count']];
      },
    },
    {
      slug: 'cubic-yard-calculator', cat: 'landscape', title: 'Cubic Yard Calculator',
      desc: 'Find cubic yards from length, width and depth, and convert yards to tons (or m³ to tonnes) for soil, gravel, sand, mulch or concrete.',
      inputs: [['mode', 'What do you know?', 'select', 0, [['The size of the area', 0], ['The volume', 1], ['The weight', 2]]],
        ['L', 'Length', 'len', 10], ['W', 'Width', 'len', 10], ['D', 'Depth', 'small', 4], ['V', 'Volume', 'vol', 1], ['T', 'Weight', 'ton', 1],
        ['mat', 'Material', 'select', 0, MATERIALS.map(([label], n) => [label, n])], ['waste', 'Extra for settling', 'pct', 5]],
      show: { L: ['mode', [0]], W: ['mode', [0]], D: ['mode', [0]], waste: ['mode', [0]], V: ['mode', [1]], T: ['mode', [2]] },
      compute(v, sys) {
        const t = MATERIALS[v.mat][1] * 1000; // kg per m³
        const V = v.mode === 1 ? v.V : v.mode === 2 ? v.T / t : v.L * v.W * v.D * (1 + v.waste);
        const vol = [['Volume', V, 'vol'], imp(sys) ? ['Volume in cubic feet', V, 'cuft'] : ['Volume in cubic yards', V / (27 * FT3), 'num'],
          imp(sys) ? ['Volume in m³', V, 'num'] : ['Volume in cubic feet', V / FT3, 'num']];
        const weight = ['Weight', V * t, 'ton'];
        return v.mode === 1 ? [weight, ...vol] : [...vol, weight]; // the first row is the headline: the thing you didn't know
      },
    },
    {
      slug: 'paver-calculator', cat: 'landscape', title: 'Paver Calculator',
      desc: 'Count the pavers for a patio or walkway, plus the gravel base and bedding sand under them, from the area and paver size.',
      inputs: [['L', 'Area length', 'len', 10], ['W', 'Area width', 'len', 10], ['PL', 'Paver length', 'small', 8], ['PW', 'Paver width', 'small', 4],
        ['gap', 'Joint gap', 'small', 0], ['base', 'Gravel base depth', 'small', 4], ['sand', 'Sand bed depth', 'small', 1], ['waste', 'Extra for cuts', 'pct', 5]],
      compute(v, sys) {
        // Base gravel gets 20% extra and sand 10%, because both compact.
        const A = v.L * v.W, perM2 = 1 / ((v.PL + v.gap) * (v.PW + v.gap)), G = A * v.base * 1.2, S = A * v.sand * 1.1;
        return [['Area', A, 'area'], ['Pavers needed', up(A * perM2 * (1 + v.waste)), 'count'], perArea('Pavers', perM2, sys),
          ['Gravel base', G, 'vol'], ['Gravel base weight', G * 1680, 'ton'],
          imp(sys) ? ['0.5 cu ft bags of sand', up(S / (0.5 * FT3)), 'count'] : ['25 kg bags of sand', up((S * 1600) / 25), 'count']];
      },
    },
    {
      slug: 'sod-calculator', cat: 'landscape', title: 'Sod Calculator',
      desc: 'Calculate how much sod or turf you need for a lawn, in square feet, pieces and pallets (or m² and rolls).',
      inputs: [['L', 'Lawn length', 'len', 20], ['W', 'Lawn width', 'len', 25], ['waste', 'Extra for edges and cuts', 'pct', 5]],
      compute(v, sys) {
        const A = v.L * v.W * (1 + v.waste);
        return [['Sod to buy', A, 'area'], ...(imp(sys)
          ? [['Pieces (2 × 5 ft)', up(A / (10 * FT2)), 'count'], ['Pallets (about 450 sq ft)', up(A / (450 * FT2)), 'count']]
          : [['Rolls (1 m²)', up(A), 'count']])];
      },
    },
    {
      slug: 'fence-calculator', cat: 'landscape', title: 'Fence Calculator',
      desc: 'Work out the posts, panels and rails for a straight fence run from its length and post spacing.',
      inputs: [['L', 'Fence length', 'len', 100], ['S', 'Post spacing', 'len', 8], ['R', 'Rails per section', 'count', 2]],
      compute(v) { const s = up(v.L / v.S); return [['Sections (panels)', s, 'count'], ['Posts', s + 1, 'count'], ['Rails', s * v.R, 'count']]; },
    },
    {
      slug: 'paint-calculator', cat: 'interior', title: 'Paint Calculator',
      desc: 'Find how many gallons or litres of paint you need for a room, a house exterior or any area, with doors and windows taken out.',
      inputs: [['mode', 'What are you painting?', 'select', 0, [['A room', 0], ['A house exterior', 1], ['I know the area', 2]]],
        ['L', 'Length', 'len', 12], ['W', 'Width', 'len', 12], ['H', 'Wall height', 'len', 8], ['A', 'Area to paint', 'area', 400],
        ['doors', 'Doors', 'count', 1], ['windows', 'Windows', 'count', 2], ['ceil', 'Paint the ceiling too?', 'select', 0, yesNo],
        ['cov', 'Surface', 'select', 0, [['Smooth walls (about 350 sq ft per gallon)', 350 * FT2 / GAL], ['Siding or trim (about 300 sq ft per gallon)', 300 * FT2 / GAL],
          ['Rough: stucco, brick, block (about 200 sq ft per gallon)', 200 * FT2 / GAL]]],
        ['coats', 'Coats', 'count', 2]],
      show: { L: ['mode', [0, 1]], W: ['mode', [0, 1]], H: ['mode', [0, 1]], A: ['mode', [2]], doors: ['mode', [0, 1]], windows: ['mode', [0, 1]], ceil: ['mode', [0]] },
      compute(v, sys) {
        // 20 sq ft per door, 15 sq ft per window; coverage (area per volume) comes from the Surface menu
        const A = v.mode === 2 ? v.A : Math.max(0, 2 * (v.L + v.W) * v.H - v.doors * 20 * FT2 - v.windows * 15 * FT2 + (v.mode === 0 ? v.ceil * v.L * v.W : 0));
        const P = (A * v.coats) / v.cov;
        return [['Area to paint', A, 'area'], ['Paint needed', P, 'liq'], imp(sys) ? ['1 gallon cans', up(P / GAL), 'count'] : ['2.5 L tins', up(P / 0.0025), 'count']];
      },
    },
    {
      slug: 'tile-calculator', cat: 'interior', title: 'Tile Calculator',
      desc: 'Count the floor or wall tiles and boxes you need from the area and the tile size, with extra for cuts.',
      inputs: [['L', 'Area length', 'len', 10], ['W', 'Area width', 'len', 10], ['TL', 'Tile length', 'small', 12], ['TW', 'Tile width', 'small', 12], ['box', 'Tiles per box', 'count', 10], ['waste', 'Extra for cuts and breakage', 'pct', 10]],
      compute(v) {
        const A = v.L * v.W, t = up((A * (1 + v.waste)) / (v.TL * v.TW));
        return [['Area', A, 'area'], ['Tiles needed', t, 'count'], ['Boxes', up(t / v.box), 'count']];
      },
    },
    {
      slug: 'flooring-calculator', cat: 'interior', title: 'Flooring Calculator',
      desc: 'Work out how many boxes of laminate, vinyl plank or hardwood flooring, and rolls of underlayment, to buy for one or two rooms.',
      inputs: [['L', 'Room length', 'len', 12], ['W', 'Room width', 'len', 15], ['L2', 'Second area length (0 if none)', 'len', 0], ['W2', 'Second area width (0 if none)', 'len', 0],
        ['box', 'Coverage per box', 'area', 20], ['waste', 'Extra for cuts', 'pct', 10]],
      compute(v, sys) {
        const A = v.L * v.W + v.L2 * v.W2, buy = A * (1 + v.waste), boxes = up(buy / v.box);
        return [['Floor area', A, 'area'], ['Flooring to buy', buy, 'area'], ['Boxes', boxes, 'count'], ['Flooring in full boxes', boxes * v.box, 'area'],
          imp(sys) ? ['Underlayment rolls (100 sq ft)', up(A * 1.05 / (100 * FT2)), 'count'] : ['Underlayment rolls (10 m²)', up(A * 1.05 / 10), 'count']];
      },
    },
    {
      slug: 'drywall-calculator', cat: 'interior', title: 'Drywall Calculator',
      desc: 'Calculate the drywall (plasterboard) sheets and screws for a room\'s walls and ceiling.',
      inputs: [['L', 'Room length', 'len', 12], ['W', 'Room width', 'len', 12], ['H', 'Wall height', 'len', 8], ['ceil', 'Include the ceiling?', 'select', 0, yesNo],
        ['S', 'Sheet size', 'select', 0, [['4 × 8 ft', 32 * FT2], ['4 × 10 ft', 40 * FT2], ['4 × 12 ft', 48 * FT2], ['1.2 × 2.4 m', 1.2 * 2.4]]],
        ['waste', 'Extra for cuts', 'pct', 10]],
      compute(v) {
        const A = 2 * (v.L + v.W) * v.H + v.ceil * v.L * v.W, n = up((A * (1 + v.waste)) / v.S);
        return [['Surface area', A, 'area'], ['Sheets', n, 'count'], ['Screws (about 1 per sq ft)', up((n * v.S) / FT2), 'count']];
      },
    },
    {
      slug: 'baseboard-calculator', cat: 'interior', title: 'Baseboard Calculator',
      desc: 'Find the length of baseboard (skirting board) and the number of pieces you need for a room.',
      inputs: [['L', 'Room length', 'len', 12], ['W', 'Room width', 'len', 12], ['doors', 'Doorways', 'count', 1], ['DW', 'Doorway width', 'small', 36], ['PL', 'Piece length', 'len', 8], ['waste', 'Extra for miter cuts', 'pct', 10]],
      compute(v) {
        const len = Math.max(0, 2 * (v.L + v.W) - v.doors * v.DW) * (1 + v.waste);
        return [['Baseboard needed', len, 'len'], ['Pieces', up(len / v.PL), 'count']];
      },
    },
    {
      slug: 'insulation-calculator', cat: 'interior', title: 'Insulation Calculator',
      desc: 'Work out how many bags of batt, roll or blown-in insulation you need for an attic or walls, and how thick it must be for your R-value.',
      inputs: [['L', 'Area length', 'len', 30], ['W', 'Area width (or wall height)', 'len', 20],
        ['type', 'Insulation type', 'select', 0, INSULATION.map(([label], n) => [label, n])], ['R', 'Target R-value (US)', 'count', 38],
        ['cov', 'Coverage per bag at that R-value', 'area', 40], ['waste', 'Extra', 'pct', 5]],
      compute(v) {
        const A = v.L * v.W;
        return [['Area', A, 'area'], ['Bags', up((A * (1 + v.waste)) / v.cov), 'count'],
          ['Thickness needed', (v.R / INSULATION[v.type][1]) * IN, 'small'], ['Metric R-value (RSI)', v.R / 5.678, 'num']];
      },
    },
    {
      slug: 'deck-calculator', cat: 'build', title: 'Deck Board Calculator',
      desc: 'Calculate the deck boards and joists for a rectangular deck from its size, board width and joist spacing.',
      inputs: [['L', 'Deck length (direction boards run)', 'len', 16], ['W', 'Deck width', 'len', 12], ['BW', 'Board width (actual)', 'small', 5.5], ['gap', 'Gap between boards', 'small', 0.125],
        ['BL', 'Board length', 'len', 16], ['JS', 'Joist spacing (on center)', 'small', 16], ['waste', 'Extra for cuts', 'pct', 10]],
      compute(v) {
        const rows = up(v.W / (v.BW + v.gap));
        return [['Deck boards', up((rows * v.L * (1 + v.waste)) / v.BL), 'count'], ['Joists', up(v.L / v.JS) + 1, 'count'], ['Rows of boards', rows, 'count'], ['Deck area', v.L * v.W, 'area']];
      },
    },
    {
      slug: 'roofing-calculator', cat: 'build', title: 'Roofing Calculator',
      desc: 'Estimate roof area, roofing squares, shingle bundles, underlayment, drip edge, ridge cap and nails from the house footprint and roof pitch.',
      inputs: [['L', 'Footprint length (with overhangs)', 'len', 40], ['W', 'Footprint width (with overhangs)', 'len', 30], ['pitch', 'Roof pitch', 'select', 6, pitches], ['waste', 'Extra for waste', 'pct', 10]],
      compute(v, sys) {
        // A simple gable roof with the ridge along the length: eaves are the two lengths, rakes the four sloped edges.
        const A = v.L * v.W * v.pitch * (1 + v.waste), sq = A / (100 * FT2), piece = imp(sys) ? 10 * FT : 3;
        const edge = (2 * v.L + 2 * v.W * v.pitch) * 1.1; // 10% for overlaps
        return [['Roof area incl. waste', A, 'area'], ['Roofing squares', sq, 'num'], ['Shingle bundles (3 per square)', up(sq * 3), 'count'],
          ['Underlayment rolls (10 squares each)', up(sq / 10), 'count'], [imp(sys) ? 'Drip edge (10 ft pieces)' : 'Drip edge (3 m pieces)', up(edge / piece), 'count'],
          ['Ridge cap bundles (about 25 ft each)', up(v.L / (25 * FT)), 'count'], ['Roofing nails (about 320 per square)', up(sq * 320), 'count']];
      },
    },
    {
      slug: 'stair-calculator', cat: 'build', title: 'Stair Calculator',
      desc: 'Work out the number of steps, riser height, total run and stringer length for a straight staircase.',
      inputs: [['rise', 'Total rise (floor to floor)', 'small', 108], ['max', 'Maximum riser height', 'small', 7.75], ['tread', 'Tread depth', 'small', 10]],
      compute(v) {
        const n = up(v.rise / v.max), run = (n - 1) * v.tread, h = v.rise / n;
        return [['Risers (steps)', n, 'count'], ['Riser height', h, 'small'], ['Treads', n - 1, 'count'], ['Total run', run, 'small'], ['Stringer length', Math.hypot(v.rise, run), 'len'],
          ['Stair angle (degrees)', (Math.atan2(h, v.tread) * 180) / Math.PI, 'num'], ['Comfort check: 2 risers + 1 tread', 2 * h + v.tread, 'small']];
      },
    },
    {
      slug: 'framing-calculator', cat: 'build', title: 'Wall Framing Calculator',
      desc: 'Count the studs and plates for a framed wall from its length, stud spacing, corners and openings.',
      inputs: [['L', 'Wall length', 'len', 12], ['S', 'Stud spacing (on center)', 'small', 16], ['C', 'Corners and wall intersections', 'count', 2],
        ['O', 'Doors and windows', 'count', 1], ['plates', 'Plates', 'select', 1, [['Single top plate (2 plates)', 2], ['Double top plate (3 plates)', 3]]],
        ['PL', 'Plate board length', 'len', 16], ['waste', 'Extra', 'pct', 10]],
      compute(v) {
        // One stud per spacing plus one, 2 extra per corner or intersection, 2 extra (king studs) per opening.
        const studs = up((up(v.L / v.S) + 1 + 2 * v.C + 2 * v.O) * (1 + v.waste)), plate = v.L * v.plates;
        return [['Studs', studs, 'count'], ['Plate boards', up((plate * (1 + v.waste)) / v.PL), 'count'], ['Plate length', plate, 'len']];
      },
    },
    {
      slug: 'siding-calculator', cat: 'build', title: 'Siding Calculator',
      desc: 'Estimate the siding for a house in square feet, squares and boxes, with gable ends added and doors and windows taken out.',
      inputs: [['L', 'House length', 'len', 40], ['W', 'House width', 'len', 30], ['H', 'Wall height', 'len', 9], ['G', 'Gable height (0 for none)', 'len', 6],
        ['doors', 'Doors', 'count', 2], ['windows', 'Windows', 'count', 8], ['waste', 'Extra for cuts', 'pct', 10]],
      head: 'Siding to buy',
      compute(v) {
        // Two triangular gables on the width ends: 2 × (W × G ÷ 2). 20 sq ft per door, 15 sq ft per window.
        const A = Math.max(0, 2 * (v.L + v.W) * v.H + v.W * v.G - v.doors * 20 * FT2 - v.windows * 15 * FT2), buy = A * (1 + v.waste), sq = buy / (100 * FT2);
        return [['Wall area', A, 'area'], ['Siding to buy', buy, 'area'], ['Squares (100 sq ft)', sq, 'num'], ['Vinyl siding boxes (2 squares each)', up(sq / 2), 'count']];
      },
    },
    {
      slug: 'board-foot-calculator', cat: 'build', title: 'Board Foot Calculator',
      desc: 'Calculate board feet for lumber and hardwood from thickness, width, length and quantity.',
      inputs: [['T', 'Thickness', 'small', 2], ['W', 'Width', 'small', 6], ['L', 'Length', 'len', 8], ['N', 'Number of boards', 'count', 10]],
      compute(v) { const V = v.T * v.W * v.L * v.N; return [['Board feet', V / (144 * IN ** 3), 'num'], ['Volume', V, 'cuft']]; },
    },
    {
      slug: 'square-footage-calculator', cat: 'build', title: 'Square Footage Calculator',
      desc: 'Find the area of a room, L-shaped space, circle or triangle in square feet, square yards and square metres.',
      inputs: [['shape', 'Shape', 'select', 0, [['Rectangle', 0], ['L-shape or two rooms', 1], ['Circle', 2], ['Triangle', 3]]],
        ['L', 'Length', 'len', 12], ['W', 'Width', 'len', 15], ['L2', 'Second part length', 'len', 8], ['W2', 'Second part width', 'len', 6],
        ['D', 'Diameter', 'len', 10], ['B', 'Base', 'len', 10], ['TH', 'Height (base to tip)', 'len', 8]],
      show: { L: ['shape', [0, 1]], W: ['shape', [0, 1]], L2: ['shape', [1]], W2: ['shape', [1]], D: ['shape', [2]], B: ['shape', [3]], TH: ['shape', [3]] },
      compute(v, sys) {
        const A = v.shape === 1 ? v.L * v.W + v.L2 * v.W2 : v.shape === 2 ? Math.PI * (v.D / 2) ** 2 : v.shape === 3 ? (v.B * v.TH) / 2 : v.L * v.W;
        const edge = v.shape === 2 ? [['Circumference', Math.PI * v.D, 'len']] : v.shape ? [] : [['Perimeter', 2 * (v.L + v.W), 'len']];
        return [['Area', A, 'area'], imp(sys) ? ['Area in m²', A, 'num'] : ['Area in sq ft', A / FT2, 'num'], ['Area in square yards', A / (9 * FT2), 'num'], ...edge];
      },
    },
  ];

  // Short help shown under a field: { slug: { inputId: text } }
  const HINTS = {
    'concrete-calculator': {
      shape: 'For fence posts and Sonotubes, use the <a href="/concrete-column-calculator/">post hole concrete calculator</a>.',
      T: 'Patios and paths: 4 in (10 cm). Driveways: 5–6 in (13–15 cm). Footings: often 8–12 in (20–30 cm).',
      R: 'Usually 6–7¾ in (15–19.5 cm).',
    },
    'concrete-block-calculator': { B: 'The face size is the same for every block width, so the count is too.' },
    'mortar-calculator': { U: 'Mortar mix bags are cement, lime and sand together. Just add water.' },
    'retaining-wall-calculator': { H: 'Walls over 3–4 ft (1–1.2 m) usually need geogrid and an engineer.', BL: 'Read the size on the block label. 12 × 4 in and 16 × 6 in are common.' },
    'rebar-calculator': { S: '12–18 in (30–45 cm) is common for patios and driveways.', E: 'Keep bars about 3 in (7.5 cm) from the edges.' },
    'sand-calculator': { D: 'Under pavers: 1 in (2.5 cm). Sandbox: 6–12 in (15–30 cm).' },
    'cubic-yard-calculator': { D: 'Lawn topsoil: 4–6 in. Gravel paths: 2–3 in. Mulch: 2–3 in.' },
    'square-footage-calculator': { shape: 'For an odd-shaped room, split it into rectangles and use the L-shape option.' },
    'flooring-calculator': { box: 'Printed on the box, often around 20 sq ft (1.9 m²).', L2: 'A closet, hallway or second room. Leave at 0 for one room.' },
    'insulation-calculator': { R: 'Attics: R-38 to R-60 in most of the US. 2×4 walls: R-13 to R-15.', cov: 'Read it from the chart on the bag, at your R-value.' },
    'framing-calculator': { S: '16 in (40 cm) is standard. 24 in (60 cm) for some walls.' },
    'siding-calculator': { G: 'From the top of the wall to the roof peak, on the gable ends.' },
    'concrete-column-calculator': {
      D: 'About 3× the post width: 10–12 in (25–30 cm) for a 4×4 post.',
      H: 'Usually ⅓ to ½ of the post height above ground, and below the frost line.',
      P: 'A 4×4 post is 3.5 in (8.9 cm) wide. A 6×6 is 5.5 in (14 cm).',
    },
    'gravel-calculator': { D: 'Paths: 2–3 in (5–7.5 cm). Base under pavers or a shed: 4–6 in (10–15 cm).' },
    'topsoil-calculator': { D: 'New lawn: 4–6 in (10–15 cm). Raised beds: 8–12 in (20–30 cm).' },
    'mulch-calculator': { D: '2–3 in (5–7.5 cm) suits most garden beds.' },
    'paver-calculator': { PL: 'Check the product label. 4 × 8 in (10 × 20 cm) is a common size.' },
    'fence-calculator': { S: 'Most wood and vinyl panels are 6 or 8 ft (1.8 or 2.4 m) wide.' },
    'paint-calculator': { coats: '2 coats for most walls. 3 for a big color change.' },
    'tile-calculator': { box: 'Printed on the box.', waste: '10% for a straight layout, 15% for diagonal or herringbone.' },
    'baseboard-calculator': { PL: 'Usually sold in 8, 12 or 16 ft (2.4, 3.6 or 4.8 m) lengths.' },
    'deck-calculator': {
      BW: 'Use the real width: a "6 inch" deck board is 5.5 in (14 cm).',
      JS: '16 in (40 cm) for wood. Often 12 in (30 cm) for composite.',
    },
    'roofing-calculator': { pitch: 'Inches of rise per 12 in of run. Most houses are 4/12 to 8/12.' },
    'stair-calculator': { rise: 'Measure from finished floor to finished floor.', max: 'US residential code limit: 7¾ in (19.7 cm).' },
    'board-foot-calculator': { T: 'Use the nominal size: a 2×6 counts as 2 in, 8/4 hardwood as 2 in.' },
  };
  // Default prices for the cost estimate, keyed by result row label: [imperial price, metric price, optional "per" text].
  // Rough typical US big-box prices; visitors edit them. Only rows listed here are priced; calcs without an entry show no estimate.
  // shortcut: one price per row and no regional pricing; add a store/region picker only if visitors ask for it.
  const bag = { '80 lb bags': [6.5], '25 kg bags': [, 6] };
  const mortar = { '80 lb bags of mortar mix': [8], '25 kg bags of mortar mix': [, 7] };
  const PRICES = {
    'concrete-calculator': bag,
    'concrete-column-calculator': bag,
    'concrete-block-calculator': { 'Blocks needed': [2.25, 2.5], ...mortar },
    'brick-calculator': { 'Bricks needed': [0.75, 0.8], ...mortar },
    'mortar-calculator': mortar,
    'retaining-wall-calculator': { 'Wall blocks': [3.5, 3.5], 'Cap blocks': [4, 4], 'Gravel (base + drainage)': [50, 65] },
    'rebar-calculator': { 'Bars to buy': [13, 13] },
    'gravel-calculator': { 'Volume needed': [50, 65] },
    'topsoil-calculator': { 'Volume needed': [40, 52] },
    'mulch-calculator': { '2 cu ft bags': [4.5], '50 L bags': [, 5] },
    'sand-calculator': { 'Volume needed': [50, 65] },
    'paver-calculator': { 'Pavers needed': [0.9, 0.9], 'Gravel base': [50, 65], '0.5 cu ft bags of sand': [5], '25 kg bags of sand': [, 4] },
    'sod-calculator': { 'Sod to buy': [0.55, 6] },
    'fence-calculator': { 'Sections (panels)': [65, 65], 'Posts': [18, 18] },
    'paint-calculator': { '1 gallon cans': [40], '2.5 L tins': [, 35] },
    'tile-calculator': { 'Boxes': [25, 25] },
    'flooring-calculator': { 'Flooring in full boxes': [3.5, 38] },
    'drywall-calculator': { 'Sheets': [16, 16], 'Screws (about 1 per sq ft)': [0.03, 0.03] },
    'baseboard-calculator': { 'Pieces': [14, 14] },
    'deck-calculator': { 'Deck boards': [28, 28], 'Joists': [25, 25] },
    'roofing-calculator': { 'Shingle bundles (3 per square)': [38, 38], 'Underlayment rolls (10 squares each)': [110, 110],
      'Drip edge (10 ft pieces)': [9], 'Drip edge (3 m pieces)': [, 9], 'Ridge cap bundles (about 25 ft each)': [60, 60] },
    'framing-calculator': { 'Studs': [4.5, 4.5], 'Plate boards': [9, 9] },
    'siding-calculator': { 'Siding to buy': [2.5, 27] },
    'board-foot-calculator': { 'Board feet': [6, 6, 'per board foot'] },
  };
  // Quick tips shown when hovering or tapping the "?" next to each input. "_" applies to every calculator unless overridden.
  const bulkTips = {
    D: 'How deep the layer will be once it is spread. Check a few spots and use the average.',
    waste: 'Loose material settles and packs down, so order a little extra.',
  };
  const TIPS = {
    _: {
      L: 'Run a tape along the longest side. For an L-shape, split it into rectangles and add them up.',
      W: 'Measure the other side, at a right angle to the length.',
      H: 'Measure from the floor to the ceiling.',
      waste: 'Extra on top of the exact amount for cuts, breakage and mistakes. Running short mid-job costs more than a few leftovers.',
    },
    'concrete-calculator': {
      shape: 'A footing is a long, narrow slab, so it uses the same length × width × depth math.',
      W: 'For a slab, the short side. For steps, the width from side to side.',
      D: 'The width of the round slab, measured straight through the middle.',
      T: 'The depth of your forms. Ground is rarely flat, so measure a few spots and use the average.',
      N: 'Count the risers you will pour. A landing at the top can be added as a separate slab.',
      R: 'The height of one step.',
      RUN: 'How deep each step is, front to back.',
      waste: 'Spills, bulging forms and an uneven base all eat concrete. Keep 5–10% extra.',
    },
    'mortar-calculator': {
      H: 'From the top of the footing to the top of the wall.',
      U: 'Pick the brick or block you will lay. Joints are standard: ⅜ in (10 mm).',
      layers: 'Two layers lay twice as many units, and take twice the mortar.',
      waste: 'Extra bricks or blocks for breakage and cuts. The mortar figure already allows for normal waste.',
    },
    'retaining-wall-calculator': {
      L: 'Measure along the face of the wall, end to end.',
      H: 'The finished height above the ground in front. One more course is added below ground.',
      BL: 'The face length of one block.',
      BH: 'The face height of one block.',
      BD: 'How deep the block is, from the face to the back. It sets the width of the gravel base trench.',
      CL: 'The length of one cap block. Enter 0 if the wall has no caps.',
    },
    'rebar-calculator': {
      L: 'The length of the slab.',
      W: 'The width of the slab.',
      S: 'The distance between bars, center to center. The same spacing is used both ways.',
      E: 'How far the bars stop short of the slab edge, so concrete covers them.',
      size: '#4 (½ in) or 12 mm is common for patios, driveways and footings.',
      BL: 'The length of the bars you will buy. 20 ft (6 m) is standard.',
      waste: 'Extra for offcuts and bends.',
    },
    'sand-calculator': bulkTips,
    'cubic-yard-calculator': {
      ...bulkTips,
      mode: 'Measure an area to get cubic yards, or convert a volume or weight you already know.',
      V: 'The volume you want to convert to weight.',
      T: 'The weight you want to convert to volume.',
      mat: 'Each material weighs a different amount per cubic yard. Damp material weighs more.',
    },
    'concrete-column-calculator': {
      D: 'The width of the hole, or the inside width of the tube form (like a Sonotube).',
      H: 'How deep the hole is, or how tall the column is.',
      P: 'The width of the post that sits in the concrete. It takes up space, so you need less mix. Enter 0 for a solid column.',
      N: 'How many holes or columns of this size.',
    },
    'concrete-block-calculator': { H: 'From the top of the footing to the top of the wall.', B: 'Pick the block size you will buy. Mortar joints are already included.' },
    'brick-calculator': {
      H: 'From the top of the footing to the top of the wall.',
      B: 'Pick the brick you will buy. Mortar joints are already included.',
      layers: 'Garden walls are usually one brick wide. Retaining and load-bearing walls are often two.',
    },
    'gravel-calculator': bulkTips,
    'topsoil-calculator': bulkTips,
    'mulch-calculator': bulkTips,
    'paver-calculator': {
      PL: 'Measure one paver, or read the size on the pallet label.',
      PW: 'The short side of one paver.',
      gap: 'The joint between pavers. Leave at 0 if your pavers have built-in spacer nubs.',
      base: 'Compacted crushed stone under the sand. 4 in (10 cm) for patios and paths, 6–8 in (15–20 cm) for driveways.',
      sand: 'The layer of bedding sand the pavers sit on. Usually 1 in (2.5 cm).',
      waste: 'Extra for edge cuts and broken pieces. Use 10% or more for curves or herringbone.',
    },
    'sod-calculator': { L: 'Walk the lawn area with a tape. Split odd shapes into rectangles and add them up.', waste: 'Extra for trimming around edges, beds and curves.' },
    'fence-calculator': {
      L: 'The total length of the fence line, end to end. Include the gate openings.',
      S: 'The distance from the center of one post to the center of the next.',
      R: 'The horizontal boards between each pair of posts. 2 for fences up to 5 ft, 3 for taller ones.',
    },
    'paint-calculator': {
      mode: 'A room adds up its four walls. A house adds up its outside walls. Or type in the area if you already know it.',
      L: 'A room: wall to wall along the longer side. A house: the long outside wall, corner to corner.',
      W: 'A room: wall to wall along the shorter side. A house: the short outside wall.',
      H: 'Inside: floor to ceiling. Outside: from the foundation to the bottom of the roof.',
      A: 'The wall area you will paint, not the floor area of the house.',
      cov: 'Rough and porous surfaces soak up more paint, so a gallon covers less.',
      doors: 'Each door is taken out as 20 sq ft of wall you do not paint.',
      windows: 'Each window is taken out as 15 sq ft of wall you do not paint.',
      coats: 'One gallon covers about 350 sq ft per coat.',
      ceil: 'Adds the ceiling area (the same as the floor) to the total.',
    },
    'tile-calculator': {
      TL: 'Measure one tile, or read the size on the box.',
      TW: 'The short side of one tile. Use the same number as the length for square tiles.',
      box: 'How many tiles come in one box. It is printed on the box.',
    },
    'flooring-calculator': {
      box: 'The square feet one box covers. It is printed on the end of the box.',
      L2: 'A closet, hallway or second room getting the same flooring. Leave at 0 if there is none.',
      W2: 'The other side of the second area. Leave at 0 if there is none.',
    },
    'insulation-calculator': {
      L: 'Attic: the length of the attic floor. Walls: the total length of the walls.',
      W: 'Attic: the width of the attic floor. Walls: the wall height.',
      type: 'Sets how thick the insulation must be to reach your R-value.',
      R: 'How well the insulation resists heat. Higher is better. Check your local energy code.',
      cov: 'Every bag has a chart of how much area it covers at each R-value. Use the line for your target.',
      waste: 'A little extra to fill gaps and trim around obstacles.',
    },
    'drywall-calculator': {
      ceil: 'Adds the ceiling area (the same as the floor) to the total.',
      S: 'Longer sheets mean fewer seams to tape, but they are heavier to hang.',
    },
    'baseboard-calculator': {
      L: 'Measure the room wall to wall along the longer side.',
      W: 'Measure the room wall to wall along the shorter side.',
      doors: 'Openings that get no baseboard, such as doorways and archways.',
      DW: 'The width of each opening. Standard interior doors are 30–36 in.',
      PL: 'The length of the boards sold at your store.',
      waste: 'Extra for miter cuts at the corners and mistakes.',
    },
    'deck-calculator': {
      L: 'Measure in the same direction the deck boards will run.',
      W: 'Measure across the boards, at a right angle to them.',
      BW: 'Measure a real board. Lumber is smaller than its name: a "6 inch" board is 5.5 in.',
      gap: 'The space between boards so water drains. ⅛ in is typical. Composite often uses 3/16 in.',
      BL: 'The length of the boards you will buy. Longer boards mean fewer butt joints.',
      JS: 'The distance from the center of one joist to the center of the next.',
    },
    'roofing-calculator': {
      L: 'Measure the outside walls of the house, then add the roof overhang on both ends.',
      W: 'Measure the other side of the house, plus the overhang on both sides.',
      pitch: 'How many inches the roof rises for every 12 in across. Check your house plans, or use a level and tape in the attic.',
      waste: 'Extra for cutting at hips, valleys and edges. Use 15% for complex roofs.',
    },
    'stair-calculator': {
      rise: 'The height from the finished floor at the bottom to the finished floor at the top.',
      max: 'The tallest step allowed. The US residential code limit is 7¾ in.',
      tread: 'How deep each step is, front to back. The US code minimum is 10 in.',
    },
    'board-foot-calculator': {
      T: 'The thickness of each board.',
      W: 'The width of each board.',
      L: 'The length of each board.',
      N: 'How many boards of this size.',
    },
    'square-footage-calculator': {
      shape: 'Pick the shape that matches the space. Split odd shapes into rectangles.',
      L2: 'The length of the second rectangle (the leg of the L, or a second room).',
      W2: 'The width of the second rectangle.',
      D: 'The width of the circle, measured straight through the middle.',
      B: 'The length of one side of the triangle.',
      TH: 'The straight-line distance from that side to the opposite corner, at a right angle.',
    },
    'framing-calculator': {
      L: 'The length of the wall you are framing.',
      S: 'The distance from the center of one stud to the center of the next.',
      C: 'Each corner or place where another wall meets this one needs extra studs to nail to.',
      O: 'Each opening adds king studs on both sides. Jacks and headers vary, so add them separately.',
      plates: 'Load-bearing walls usually get a double top plate. Plus one bottom plate.',
      PL: 'The length of the boards you will use for plates.',
      waste: 'Extra for crooked boards, blocking and mistakes.',
    },
    'siding-calculator': {
      L: 'The long side of the house, corner to corner.',
      W: 'The short side of the house, corner to corner.',
      H: 'From the bottom of the siding to the bottom of the roof.',
      G: 'The height of the triangle on each end wall. Enter 0 for a hip roof.',
      doors: 'Each door is taken out as 20 sq ft.',
      windows: 'Each window is taken out as 15 sq ft.',
      waste: 'Extra for cuts and overlaps. Use 15% for many corners or gables.',
    },
  };
  for (const c of CALCS) { c.hints = HINTS[c.slug]; c.prices = PRICES[c.slug]; c.tips = { ...TIPS._, ...TIPS[c.slug] }; }

  root.MM = { CALCS, CATS, UNITS };
  if (typeof module === 'object') module.exports = root.MM;
})(typeof window !== 'undefined' ? window : globalThis);
