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

  const yesNo = [['No', 0], ['Yes', 1]];
  const pitches = Array.from({ length: 13 }, (_, r) => [r ? `${r}/12` : 'Flat (0/12)', Math.sqrt(1 + (r / 12) ** 2)]);

  const CALCS = [
    {
      slug: 'concrete-calculator', cat: 'concrete', title: 'Concrete Slab Calculator',
      desc: 'Work out how much concrete you need for a slab, patio or shed base, in cubic yards or m³, plus the number of premix bags.',
      inputs: [['L', 'Slab length', 'len', 10], ['W', 'Slab width', 'len', 10], ['T', 'Thickness', 'small', 4], ['waste', 'Extra for waste', 'pct', 10]],
      compute(v, sys) { const V = v.L * v.W * v.T * (1 + v.waste); return [...volRows(V, sys), ...bags(V, sys)]; },
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
      desc: 'Count the concrete blocks (CMU or cinder blocks) for a wall from its length and height, mortar joints included.',
      inputs: [['L', 'Wall length', 'len', 20], ['H', 'Wall height', 'len', 4],
        ['B', 'Block size', 'select', 0, [['8 × 8 × 16 in (US standard)', 16 * 8 * IN * IN], ['440 × 215 mm (UK / metric)', 0.45 * 0.225]]],
        ['waste', 'Extra for breakage and cuts', 'pct', 5]],
      compute(v) { const A = v.L * v.H; return [['Wall area', A, 'area'], ['Blocks needed', up((A / v.B) * (1 + v.waste)), 'count']]; },
    },
    {
      slug: 'brick-calculator', cat: 'concrete', title: 'Brick Calculator',
      desc: 'Find how many bricks you need for a wall, for US modular, US standard or UK metric bricks with mortar joints.',
      inputs: [['L', 'Wall length', 'len', 20], ['H', 'Wall height', 'len', 4],
        ['B', 'Brick size', 'select', 0, [['US modular (7⅝ × 2¼ in)', 8 * (8 / 3) * IN * IN], ['US standard (8 × 2¼ in)', 8.375 * 2.625 * IN * IN], ['UK / metric (215 × 65 mm)', 0.225 * 0.075]]],
        ['layers', 'Wall thickness', 'select', 0, [['Single layer (one brick wide)', 1], ['Double layer (two bricks wide)', 2]]],
        ['waste', 'Extra for breakage and cuts', 'pct', 5]],
      compute(v) { const A = v.L * v.H; return [['Wall area', A, 'area'], ['Bricks needed', up((A / v.B) * v.layers * (1 + v.waste)), 'count']]; },
    },
    {
      slug: 'gravel-calculator', cat: 'landscape', title: 'Gravel Calculator',
      desc: 'Calculate gravel or crushed stone for a driveway, path or base, in cubic yards and tons (or m³ and tonnes).',
      inputs: bulkInputs(3), compute: bulk(1.68),
    },
    {
      slug: 'topsoil-calculator', cat: 'landscape', title: 'Topsoil Calculator',
      desc: 'Work out how much topsoil you need for a new lawn, garden bed or raised bed, by volume and approximate weight.',
      inputs: bulkInputs(4), compute: bulk(1.3),
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
      slug: 'paver-calculator', cat: 'landscape', title: 'Paver Calculator',
      desc: 'Count the pavers for a patio or walkway from the area and the paver size, with extra for cuts.',
      inputs: [['L', 'Area length', 'len', 10], ['W', 'Area width', 'len', 10], ['PL', 'Paver length', 'small', 8], ['PW', 'Paver width', 'small', 4], ['waste', 'Extra for cuts', 'pct', 5]],
      compute(v) { const A = v.L * v.W; return [['Area', A, 'area'], ['Pavers needed', up((A / (v.PL * v.PW)) * (1 + v.waste)), 'count']]; },
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
      desc: 'Find how many gallons or litres of paint you need for a room, with doors and windows taken out.',
      inputs: [['L', 'Room length', 'len', 12], ['W', 'Room width', 'len', 12], ['H', 'Wall height', 'len', 8], ['doors', 'Doors', 'count', 1], ['windows', 'Windows', 'count', 2], ['coats', 'Coats', 'count', 2], ['ceil', 'Paint the ceiling too?', 'select', 0, yesNo]],
      compute(v, sys) {
        // 20 sq ft per door, 15 sq ft per window, 350 sq ft per gallon per coat
        const A = Math.max(0, 2 * (v.L + v.W) * v.H - v.doors * 20 * FT2 - v.windows * 15 * FT2 + v.ceil * v.L * v.W);
        const P = (A * v.coats * GAL) / (350 * FT2);
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
      desc: 'Work out how many boxes of laminate, vinyl plank or hardwood flooring to buy for a room.',
      inputs: [['L', 'Room length', 'len', 12], ['W', 'Room width', 'len', 15], ['box', 'Coverage per box', 'area', 20], ['waste', 'Extra for cuts', 'pct', 10]],
      compute(v) {
        const A = v.L * v.W, buy = A * (1 + v.waste);
        return [['Floor area', A, 'area'], ['Flooring to buy', buy, 'area'], ['Boxes', up(buy / v.box), 'count']];
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
      desc: 'Estimate roof area, roofing squares and shingle bundles from the house footprint and roof pitch.',
      inputs: [['L', 'Footprint length (with overhangs)', 'len', 40], ['W', 'Footprint width (with overhangs)', 'len', 30], ['pitch', 'Roof pitch', 'select', 6, pitches], ['waste', 'Extra for waste', 'pct', 10]],
      compute(v) {
        const A = v.L * v.W * v.pitch * (1 + v.waste), sq = A / (100 * FT2);
        return [['Roof area incl. waste', A, 'area'], ['Roofing squares', sq, 'num'], ['Shingle bundles (3 per square)', up(sq * 3), 'count']];
      },
    },
    {
      slug: 'stair-calculator', cat: 'build', title: 'Stair Calculator',
      desc: 'Work out the number of steps, riser height, total run and stringer length for a straight staircase.',
      inputs: [['rise', 'Total rise (floor to floor)', 'small', 108], ['max', 'Maximum riser height', 'small', 7.75], ['tread', 'Tread depth', 'small', 10]],
      compute(v) {
        const n = up(v.rise / v.max), run = (n - 1) * v.tread;
        return [['Risers (steps)', n, 'count'], ['Riser height', v.rise / n, 'small'], ['Treads', n - 1, 'count'], ['Total run', run, 'small'], ['Stringer length', Math.hypot(v.rise, run), 'len']];
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
      desc: 'Find the area of a room or space in square feet and square metres from its length and width.',
      inputs: [['L', 'Length', 'len', 12], ['W', 'Width', 'len', 15]],
      compute(v, sys) {
        const A = v.L * v.W;
        return [['Area', A, 'area'], imp(sys) ? ['Area in m²', A, 'num'] : ['Area in sq ft', A / FT2, 'num'], ['Perimeter', 2 * (v.L + v.W), 'len']];
      },
    },
  ];

  // Short help shown under a field: { slug: { inputId: text } }
  const HINTS = {
    'concrete-calculator': { T: 'Patios and paths: 4 in (10 cm). Driveways: 5–6 in (13–15 cm).' },
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
    'flooring-calculator': { box: 'Printed on the box, often around 20 sq ft (1.9 m²).' },
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
  const PRICES = {
    'concrete-calculator': bag,
    'concrete-column-calculator': bag,
    'concrete-block-calculator': { 'Blocks needed': [2.25, 2.5] },
    'brick-calculator': { 'Bricks needed': [0.75, 0.8] },
    'gravel-calculator': { 'Volume needed': [50, 65] },
    'topsoil-calculator': { 'Volume needed': [40, 52] },
    'mulch-calculator': { '2 cu ft bags': [4.5], '50 L bags': [, 5] },
    'paver-calculator': { 'Pavers needed': [0.9, 0.9] },
    'sod-calculator': { 'Sod to buy': [0.55, 6] },
    'fence-calculator': { 'Sections (panels)': [65, 65], 'Posts': [18, 18] },
    'paint-calculator': { '1 gallon cans': [40], '2.5 L tins': [, 35] },
    'tile-calculator': { 'Boxes': [25, 25] },
    'flooring-calculator': { 'Boxes': [45, 45] },
    'drywall-calculator': { 'Sheets': [16, 16], 'Screws (about 1 per sq ft)': [0.03, 0.03] },
    'baseboard-calculator': { 'Pieces': [14, 14] },
    'deck-calculator': { 'Deck boards': [28, 28], 'Joists': [25, 25] },
    'roofing-calculator': { 'Shingle bundles (3 per square)': [38, 38] },
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
    'concrete-calculator': { T: 'The depth of your forms. Ground is rarely flat, so measure a few spots and use the average.', waste: 'Spills, bulging forms and an uneven base all eat concrete. Keep 5–10% extra.' },
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
    'paver-calculator': { PL: 'Measure one paver, or read the size on the pallet label.', PW: 'The short side of one paver.', waste: 'Extra for edge cuts and broken pieces. Use 10% or more for curves or herringbone.' },
    'sod-calculator': { L: 'Walk the lawn area with a tape. Split odd shapes into rectangles and add them up.', waste: 'Extra for trimming around edges, beds and curves.' },
    'fence-calculator': {
      L: 'The total length of the fence line, end to end. Include the gate openings.',
      S: 'The distance from the center of one post to the center of the next.',
      R: 'The horizontal boards between each pair of posts. 2 for fences up to 5 ft, 3 for taller ones.',
    },
    'paint-calculator': {
      L: 'Measure the room wall to wall along the longer side.',
      W: 'Measure the room wall to wall along the shorter side.',
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
    'flooring-calculator': { box: 'The square feet one box covers. It is printed on the end of the box.' },
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
    'square-footage-calculator': {},
  };
  for (const c of CALCS) { c.hints = HINTS[c.slug]; c.prices = PRICES[c.slug]; c.tips = { ...TIPS._, ...TIPS[c.slug] }; }

  root.MM = { CALCS, CATS, UNITS };
  if (typeof module === 'object') module.exports = root.MM;
})(typeof window !== 'undefined' ? window : globalThis);
