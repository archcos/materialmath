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
    builds: 'Whole Builds',
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

  const run = (slug, v, sys) => CALCS.find(c => c.slug === slug).compute(v, sys);
  const pick = (rows, label) => rows.find(r => r[0] === label)[1];

  const CALCS = [
    {
      slug: 'house-material-calculator', cat: 'builds', title: 'House Material Calculator',
      desc: 'Estimate the materials to build a house, cabin, garage or shed: foundation, framing, roof, siding and the finished inside, with a cost total, a sample floor plan and a 3D view.',
      inputs: [['L', 'Building length', 'len', 36], ['W', 'Building width', 'len', 24],
        ['stories', 'Stories', 'select', 0, [['One story', 1], ['Two stories', 2]]], ['H', 'Wall height', 'len', 8], ['H2', 'Upper floor wall height', 'len', 8],
        ['roof', 'Roof style', 'select', 0, [['Gable (two slopes)', 0], ['Hip (four slopes)', 1]]], ['pitch', 'Roof pitch', 'select', 6, pitches],
        ['over', 'Roof overhang', 'small', 12],
        ['roofing', 'Roofing', 'select', 0, [['Asphalt shingles', 0], ['Metal roofing panels', 1], ['Concrete or clay tiles', 2]]],
        ['walls', 'Walls', 'select', 0, [['Wood studs 2×4, R-13 insulation', 4], ['Wood studs 2×6, R-21 insulation', 6], ['Concrete block (CMU, hollow block)', 8]]],
        ['spacing', 'Stud spacing', 'select', 0, [['16 in (400 mm)', 16], ['24 in (600 mm)', 24]]],
        ['siding', 'Outside finish', 'select', 0, [['Vinyl siding', 0], ['Fiber cement siding', 1], ['Stucco or cement render', 2], ['Brick veneer', 3]]],
        ['I', 'Inside walls (total length)', 'len', 96], ['doors', 'Outside doors', 'count', 2], ['gdoors', 'Garage doors (16 × 7 ft)', 'count', 0],
        ['idoors', 'Inside doors', 'count', 6], ['windows', 'Windows', 'count', 8],
        ['fin', 'Inside', 'select', 0, [['Finished: insulation, drywall, paint, flooring', 1], ['Unfinished shell (shed, garage, workshop)', 0]]],
        ['floor', 'Flooring', 'select', 0, [['Laminate or vinyl plank', 0], ['Ceramic or porcelain tile', 1], ['Hardwood', 2], ['Carpet', 3]]],
        ['extras', 'Nails, screws and small items', 'select', 0, [['Include them', 1], ['Leave them out', 0]]]],
      show: { H2: ['stories', [2]], spacing: ['walls', [4, 6]], floor: ['fin', [1]] },
      // Values are imperial (ft, in) like the defaults; menus are the option's position. Materials not listed stay as chosen.
      presets: [
        ['Shed 10 × 12', { L: 12, W: 10, stories: 0, H: 8, roof: 0, pitch: 4, over: 6, walls: 0, spacing: 0, I: 0, doors: 1, gdoors: 0, idoors: 0, windows: 1, fin: 1 }],
        ['Garage 24 × 24', { L: 24, W: 24, stories: 0, H: 9, roof: 0, pitch: 5, over: 12, walls: 0, spacing: 0, I: 0, doors: 1, gdoors: 1, idoors: 0, windows: 2, fin: 1 }],
        ['Cabin 16 × 24', { L: 24, W: 16, stories: 0, H: 8, roof: 0, pitch: 8, over: 12, walls: 0, spacing: 0, I: 40, doors: 2, gdoors: 0, idoors: 2, windows: 6, fin: 0 }],
        ['Small house 24 × 36', { L: 36, W: 24, stories: 0, H: 8, roof: 1, pitch: 6, over: 12, walls: 0, spacing: 0, I: 96, doors: 2, gdoors: 0, idoors: 6, windows: 8, fin: 0 }],
        ['Family home 30 × 50', { L: 50, W: 30, stories: 0, H: 9, roof: 0, pitch: 6, over: 18, walls: 1, spacing: 0, I: 170, doors: 3, gdoors: 0, idoors: 10, windows: 14, fin: 0 }],
        ['Two-story 28 × 40', { L: 40, W: 28, stories: 1, H: 8, H2: 8, roof: 1, pitch: 6, over: 18, walls: 1, spacing: 0, I: 220, doors: 2, gdoors: 0, idoors: 12, windows: 18, fin: 0 }],
        ['Block house 26 × 33', { L: 33, W: 26, stories: 0, H: 9, roof: 1, pitch: 5, over: 24, roofing: 1, walls: 2, siding: 2, I: 90, doors: 2, gdoors: 0, idoors: 5, windows: 9, fin: 0, floor: 1 }],
      ],
      head: 'Floor area',
      related: ['concrete-calculator', 'rebar-calculator', 'framing-calculator', 'concrete-block-calculator', 'roofing-calculator', 'siding-calculator', 'insulation-calculator', 'drywall-calculator', 'paint-calculator', 'flooring-calculator', 'baseboard-calculator', 'stair-calculator'],
      compute(v, sys) {
        // A rectangular building on a concrete slab, one or two stories, with a gable or hip roof whose ridge runs
        // along the length. Each part runs the matching calculator, so the numbers match those pages.
        // Metric builds use metric bar, stud, block and board sizes.
        const m = imp(sys), st = v.stories || 1, P = 2 * (v.L + v.W), r = Math.sqrt(v.pitch ** 2 - 1), hip = v.roof === 1, block = v.walls === 8;
        const G = hip ? 0 : (v.W / 2) * r, gd = v.gdoors || 0, share = (n, f) => Math.floor(n / st) + (f < n % st ? 1 : 0);
        // Per floor: from the visitor's own floor plan when they drew one (v.plan, one count per story),
        // else the totals split evenly, with the outside doors on the ground floor. The upper floor can be taller or lower.
        const fp = f => v.plan && v.plan[f];
        const inside = f => (fp(f) ? fp(f).I : v.I / st), inDoors = f => (fp(f) ? fp(f).idoors : share(v.idoors, f));
        const outDoors = f => (fp(f) ? fp(f).doors + fp(f).gdoors : f ? 0 : v.doors + gd), wins = f => (fp(f) ? fp(f).windows : share(v.windows, f));
        const ht = f => (f && v.H2 > 0 ? v.H2 : v.H), floors = Array.from({ length: st }, (_, f) => f), Hs = floors.reduce((s, f) => s + ht(f), 0);
        const DOOR = 20 * FT2, GDOOR = 112 * FT2, WIN = 15 * FT2;
        const holes = f => (fp(f) ? fp(f).doors * DOOR + fp(f).gdoors * GDOOR : f ? 0 : v.doors * DOOR + gd * GDOOR) + wins(f) * WIN;
        // Cement render or stucco, base and finish coats together: 3/4 in (20 mm) thick; a kg of dry mix makes about 0.52 L.
        const render = A => (m ? up((A * 1.05) / ((80 * LB * 0.00052) / (0.75 * IN))) : up((A * 1.05) / ((25 * 0.00052) / 0.02)));
        const renderLabel = where => (m ? `Stucco or render, ${where} (80 lb bags)` : `Render, ${where} (25 kg bags)`);
        let mortarKg = 0;
        // Foundation: 4 in slab, thickened to 12 in deep and 12 in wide around the edge (8 in below the slab).
        const conc = (v.L * v.W * 4 * IN + P * FT * 8 * IN) * 1.1, step = m ? 0.25 * 27 * FT3 : 0.25;
        const rebar = pick(run('rebar-calculator', { L: v.L, W: v.W, S: 18 * IN, E: 3 * IN, size: m ? 1 : 4, BL: m ? 20 * FT : 6, waste: 0.05 }, sys), 'Bars to buy');
        const rows = [['Floor area', v.L * v.W * st, 'area'],
          ['Concrete: ready-mix to order', up(conc / step) * step, 'vol'], ['Gravel base under the slab', v.L * v.W * 4 * IN * 1.2, 'vol'],
          [m ? 'Rebar: #4 bars (20 ft)' : 'Rebar: 12 mm bars (6 m)', rebar, 'count']];
        if (!block) {
          // Wood walls, floor by floor: double top plate; inside walls get one intersection per 12 ft.
          const S = v.spacing === 24 ? (m ? 24 * IN : 0.6) : (m ? 16 * IN : 0.4);
          const frame = (L, C, O) => run('framing-calculator', { L, S, C, O, plates: 3, PL: m ? 16 * FT : 4.8, waste: 0.1 }, sys);
          let studs = 0, plates = 0;
          for (const f of floors) {
            const ext = frame(P, 4, outDoors(f) + wins(f)), I = inside(f);
            studs += pick(ext, 'Studs') + (I ? pick(frame(I, up(I / (12 * FT)), inDoors(f)), 'Studs') : 0);
            plates += pick(ext, 'Plate boards') + (I ? pick(frame(I, up(I / (12 * FT)), inDoors(f)), 'Plate boards') : 0);
          }
          rows.push([`Wall studs (2×${v.walls === 6 ? 6 : 4})`, studs, 'count'], [m ? 'Wall plates (16 ft boards)' : 'Wall plates (4.8 m boards)', plates, 'count']);
        } else {
          // Block walls: the outside walls and every inside wall, story by story, less the doors and windows, plus 5%.
          // Every block width has the same face, so inside walls (often thinner block) count the same way.
          const [, face, kg] = MASONRY[m ? 3 : 4];
          const A = floors.reduce((s, f) => s + Math.max(0, P * ht(f) - holes(f)) + Math.max(0, inside(f) * ht(f) - inDoors(f) * DOOR), 0);
          const n = up((A / face) * 1.05);
          mortarKg += n * kg;
          rows.push([m ? 'Concrete blocks (16 × 8 in face)' : 'Concrete blocks (440 × 215 mm face)', n, 'count']);
        }
        if (st > 1) {
          // Upper floor: 2×10 joists at 16 in (400 mm) across the width, and tongue-and-groove subfloor.
          const runs = up(v.L / (m ? 16 * IN : 0.4)) + 1, len = m ? 16 * FT : 4.8;
          rows.push([m ? 'Floor joists, upper floor (2×10, 16 ft)' : 'Floor joists, upper floor (2×10, 4.8 m)', runs * up(v.W / len), 'count'],
            ['Subfloor sheets, upper floor', up((v.L * v.W * 1.1) / (m ? 32 * FT2 : 1.2 * 2.4)), 'count']);
        }
        // Roof: trusses about 2 ft apart; hip roofs have no gable rakes but four hips that take ridge cap.
        const o = v.over, RL = v.L + 2 * o, RW = v.W + 2 * o;
        const roof = run('roofing-calculator', { L: RL, W: RW, pitch: v.pitch, waste: 0.1 }, sys), roofArea = pick(roof, 'Roof area incl. waste');
        const edge = (hip ? 2 * (RL + RW) : 2 * RL + 2 * RW * v.pitch) * 1.1, piece = m ? 10 * FT : 3;
        const ridge = hip ? Math.max(0, RL - RW) + 4 * Math.sqrt(2 * (RW / 2) ** 2 + ((RW / 2) * r) ** 2) : RL;
        // Outside walls: every story plus a 1 ft floor band between them, the gables, minus doors and windows.
        const wallArea = Math.max(0, P * (Hs + (st - 1) * FT) + v.W * G - v.doors * DOOR - gd * GDOOR - v.windows * WIN);
        const sheet = m ? 32 * FT2 : 1.2 * 2.4, sheetLabel = m ? '4 × 8 sheets' : '1.2 × 2.4 m sheets';
        rows.push(['Roof trusses (about 2 ft apart)', up(v.L / (m ? 24 * IN : 0.6)) + 1, 'count'],
          block ? [`Roof sheathing (${sheetLabel})`, up(roofArea / sheet), 'count'] : [`Sheathing, roof and walls (${sheetLabel})`, up((roofArea + wallArea * 1.1) / sheet), 'count']);
        const under = ['Roof underlayment rolls', pick(roof, 'Underlayment rolls (10 squares each)'), 'count'], drip = [m ? 'Drip edge (10 ft pieces)' : 'Drip edge (3 m pieces)', up(edge / piece), 'count'];
        if (v.roofing === 1) {
          // Metal: panels run from eave to ridge; about 3 ft (0.9 m) of cover each. A hip roof's triangles are counted by area.
          const cover = m ? 3 * FT : 0.9, slope = (RW / 2) * v.pitch;
          rows.push(['Metal roofing', roofArea, 'area'], [m ? 'Metal roof panels (3 ft wide)' : 'Metal roof sheets (0.9 m wide)', hip ? up(roofArea / (cover * slope)) : 2 * up(RL / cover), 'count'],
            ['Panel length (eave to ridge)', slope, 'len'], under, drip, [m ? 'Metal ridge cap (10 ft pieces)' : 'Metal ridge cap (3 m pieces)', up((ridge * 1.1) / piece), 'count']);
        } else if (v.roofing === 2) {
          // Concrete or clay tiles: about 90 per square (10.5 per m²); ridge tiles about 16½ in (42 cm) long.
          rows.push(['Roof tiles', up(roofArea * (m ? 90 / (100 * FT2) : 10.5)), 'count'], under, drip, ['Ridge tiles', up((ridge * 1.05) / 0.42), 'count']);
        } else {
          rows.push(['Roofing squares', pick(roof, 'Roofing squares'), 'num'], ['Shingle bundles', pick(roof, 'Shingle bundles (3 per square)'), 'count'],
            under, drip, ['Ridge cap bundles', up(ridge / (25 * FT)), 'count']);
        }
        // Outside finish over the wall area, plus 10% for siding (stucco and brick have their own extra).
        if (v.siding === 3) {
          const [, face, kg] = MASONRY[m ? 0 : 2], n = up((wallArea / face) * 1.05);
          mortarKg += n * kg;
          rows.push(['Bricks for the veneer', n, 'count']);
        } else if (v.siding === 2) rows.push([renderLabel('outside walls'), render(wallArea), 'count']);
        else rows.push([v.siding === 1 ? 'Siding: fiber cement' : 'Siding: vinyl', wallArea * 1.1, 'area']);
        if (block || v.siding === 3) rows.push(mortarBags(mortarKg, sys)); // block walls and brick veneer are laid in mortar
        // Nails, screws and small items, worked out from the rows above (v.extras). Nails are sold by weight:
        // 5 lb boxes in the US, by the kilo elsewhere. Counts per lb / kg are for common nails of that size.
        const misc = rows => {
          if (!v.extras) return rows;
          const got = test => rows.filter(r => (typeof test === 'string' ? r[0] === test : test.test(r[0]))).reduce((s, r) => s + r[1], 0);
          const out = [], sqft = a => a / FT2;
          const nails = (imp, met, n, perLb, perKg) => out.push(m ? [`Nails: ${imp} (5 lb boxes)`, up(n / perLb / 5), 'count'] : [`Nails: ${met} (kg)`, up(n / perKg), 'count']);
          // Slab: a tie at every rebar crossing (about 8 in / 20 cm of 16-gauge wire each) and a chair about every 3 ft (0.9 m).
          const S = 18 * IN, ties = (up(v.L / S) + 1) * (up(v.W / S) + 1), wire = ties * 0.2 * 0.0158;
          out.push(m ? ['Rebar tie wire (3½ lb coils)', up(wire / (3.5 * LB)), 'count'] : ['Rebar tie wire, 1.6 mm (kg)', up(wire), 'count'],
            [m ? 'Rebar chairs (2 in)' : 'Rebar chairs (50 mm)', up(v.L / 0.9) * up(v.W / 0.9), 'count']);
          if (!block) {
            // Wood walls: anchor bolts every 6 ft (1.8 m) plus the corners; about 6 nails per stud and 12 per plate board.
            out.push([m ? 'Anchor bolts (½ × 10 in)' : 'Anchor bolts (M12 × 250 mm)', up(P / 1.8) + 4, 'count']);
            nails('16d framing', '90 mm framing', got(/^Wall studs/) * 6 + got(/^Wall plates/) * 12, 50, 100);
          }
          // Sheathing and subfloor: about 50 nails a sheet (6 in apart on the edges, 12 in across the middle).
          nails('8d sheathing', '65 mm sheathing', (got(/sheathing/i) + got('Subfloor sheets, upper floor')) * 50, 100, 230);
          if (st > 1) out.push(['Construction adhesive, subfloor (tubes)', up(got('Subfloor sheets, upper floor') / 2), 'count']);
          out.push(['Hurricane ties (2 per truss)', got('Roof trusses (about 2 ft apart)') * 2, 'count']);
          // Roof covering: 320 nails a square for shingles; about 8.6 screws per m² (0.8 per sq ft) for metal; one fixing per tile.
          if (v.roofing === 1) out.push(['Metal roofing screws (bags of 250)', up((roofArea * 8.6) / 250), 'count']);
          else if (v.roofing === 2) out.push(['Roof tile nails or clips (boxes of 1,000)', up(got('Roof tiles') / 1000), 'count']);
          else nails('1¼ in roofing', '32 mm roofing', (sqft(roofArea) / 100) * 320, 140, 400);
          // Outside finish: siding nails about 1½ per sq ft; brick veneer one tie per 2⅔ sq ft (0.25 m²); house wrap under wood walls.
          if (v.siding === 3) out.push(['Brick ties', up(wallArea / (2.67 * FT2)), 'count']);
          else if (v.siding !== 2) nails('1½ in galvanized siding', '40 mm galvanized siding', sqft(wallArea) * 1.5, 130, 350);
          if (!block) out.push(m ? ['House wrap (9 × 100 ft rolls)', up((wallArea * 1.1) / (900 * FT2)), 'count'] : ['House wrap (1.5 × 50 m rolls)', up((wallArea * 1.1) / 75), 'count']);
          const trim = got(/^Baseboard/), dw = got('Drywall sheets');
          // Block walls: plugs ("tox") and screws to fix door frames (8), window frames (6) and baseboard (4 a piece) to the block.
          if (block) out.push(['Wall plugs (tox) with screws (packs of 100)', up(((v.doors + v.idoors + gd) * 8 + v.windows * 6 + trim * 4) / 100), 'count']);
          if (v.fin) {
            // Drywall: about 32 screws a sheet; 12 ft (3.6 m) of tape a sheet, and a bucket of joint compound per 13 sheets.
            out.push(['Drywall screws (boxes of 1,000)', up((dw * 32) / 1000), 'count'], m ? ['Joint compound (4.5 gal buckets)', up(dw / 13), 'count'] : ['Joint compound (20 kg buckets)', up(dw / 13), 'count'],
              m ? ['Drywall tape (500 ft rolls)', up((dw * 12) / 500), 'count'] : ['Drywall tape (150 m rolls)', up((dw * 3.6) / 150), 'count']);
            if (!block) nails('2 in finish', '50 mm finish', trim * 12, 300, 900);
            out.push(['Caulk (tubes)', up(v.doors + gd + v.windows + v.idoors / 2 + trim / 6), 'count']);
            // Tile grout: about 150 sq ft per 25 lb bag (6 m² per 5 kg) for 12 in (30 cm) tiles with ⅛ in (3 mm) joints.
            if (v.floor === 1) { const A = got('Flooring: ceramic or porcelain tile'); out.push(m ? ['Tile grout (25 lb bags)', up(sqft(A) / 150), 'count'] : ['Tile grout (5 kg bags)', up(A / 6), 'count']); }
          }
          return [...rows, ...out];
        };
        if (!v.fin) return misc(rows);
        // Finished inside, floor by floor. Wood walls: batts in the outside walls (R-13 for 2×4, R-21 for 2×6) and drywall on
        // every wall face. Block walls: rendered inside instead, with drywall on the ceilings only. All: R-38 blown-in
        // cellulose in the attic, two coats of paint, flooring and baseboard.
        const ins = (L, W, type, R) => pick(run('insulation-calculator', { L, W, type, R, cov: 40 * FT2, waste: 0.05 }, sys), 'Bags');
        const dry = (L, W, H, ceil) => pick(run('drywall-calculator', { L, W, H, ceil, S: sheet, waste: 0.1 }, sys), 'Sheets');
        const base = (L, W, doors) => pick(run('baseboard-calculator', { L, W, doors, DW: 36 * IN, PL: m ? 8 * FT : 2.4, waste: 0.1 }, sys), 'Pieces');
        let drywall = 0, trim = 0, paintArea = 0, plaster = 0;
        for (const f of floors) {
          const id = inDoors(f), I = inside(f), H = ht(f), od = fp(f) ? fp(f).doors : f ? 0 : v.doors; // garage doors get no baseboard gap or paint deduction
          const walls = P * H + 2 * I * H - (od + 2 * id) * DOOR - wins(f) * WIN; // inside faces of every wall
          if (block) { drywall += dry(v.L, v.W, 0, 1); plaster += Math.max(0, walls); }
          else drywall += dry(v.L, v.W, H, 1) + (I ? dry(I, 0, H, 0) : 0);
          trim += base(v.L, v.W, od) + (I ? base(I, 0, 2 * id) : 0);
          paintArea += walls + v.L * v.W;
        }
        const paint = run('paint-calculator', { mode: 2, A: Math.max(0, paintArea), coats: 2, cov: 350 * FT2 / GAL }, sys)[2][1];
        const flooring = v.L * v.W * st * 1.1, R = v.walls === 6 ? 21 : 13;
        if (!block) rows.push([`Wall insulation bags (R-${R} batts)`, ins(P, Hs, 0, R), 'count']);
        rows.push(['Attic insulation bags (R-38 blown-in)', ins(v.L, v.W, 2, 38), 'count'], ['Drywall sheets', drywall, 'count']);
        if (block) rows.push([renderLabel('inside walls'), render(plaster), 'count']);
        rows.push([m ? '1 gallon cans of paint' : '2.5 L tins of paint', paint, 'count'],
          [['Flooring: laminate or vinyl plank', 'Flooring: ceramic or porcelain tile', 'Flooring: hardwood', 'Flooring: carpet'][v.floor] || 'Flooring: laminate or vinyl plank', flooring, 'area']);
        // Thinset under tile: a 50 lb bag covers about 95 sq ft with a ¼ in notched trowel; a 20 kg bag about 5 m².
        if (v.floor === 1) rows.push(m ? ['Tile adhesive (50 lb bags)', up(flooring / (95 * FT2)), 'count'] : ['Tile adhesive (20 kg bags)', up(flooring / 5), 'count']);
        rows.push([m ? 'Baseboard (8 ft pieces)' : 'Baseboard (2.4 m pieces)', trim, 'count']);
        return misc(rows);
      },
    },
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
    'house-material-calculator': {
      I: 'Rough guide: about 1 ft of inside wall for every 9 sq ft of floor (1 m per 3 m²). Enter 0 for one open room.',
      fin: 'An unfinished shell leaves out insulation, drywall, paint, flooring and baseboard.',
      walls: 'Block walls count blocks and mortar for every wall. The grout and steel in the block cores are not included.',
    },
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
    'house-material-calculator': {
      'Concrete: ready-mix to order': [165, 215], 'Gravel base under the slab': [50, 65],
      'Rebar: #4 bars (20 ft)': [13], 'Rebar: 12 mm bars (6 m)': [, 11],
      'Wall studs (2×4)': [4.5, 4.5], 'Wall studs (2×6)': [7, 7], 'Wall plates (16 ft boards)': [9], 'Wall plates (4.8 m boards)': [, 9],
      'Floor joists, upper floor (2×10, 16 ft)': [24], 'Floor joists, upper floor (2×10, 4.8 m)': [, 24], 'Subfloor sheets, upper floor': [38, 38],
      'Roof trusses (about 2 ft apart)': [180, 180],
      'Sheathing, roof and walls (4 × 8 sheets)': [18], 'Sheathing, roof and walls (1.2 × 2.4 m sheets)': [, 18],
      'Roof sheathing (4 × 8 sheets)': [18], 'Roof sheathing (1.2 × 2.4 m sheets)': [, 18],
      'Concrete blocks (16 × 8 in face)': [2.25], 'Concrete blocks (440 × 215 mm face)': [, 2.5], ...mortar,
      'Metal roofing': [4.5, 48], 'Metal ridge cap (10 ft pieces)': [22], 'Metal ridge cap (3 m pieces)': [, 22], 'Roof tiles': [1.6, 1.6], 'Ridge tiles': [5, 5],
      'Bricks for the veneer': [0.75, 0.8], 'Stucco or render, outside walls (80 lb bags)': [14], 'Render, outside walls (25 kg bags)': [, 8],
      'Stucco or render, inside walls (80 lb bags)': [14], 'Render, inside walls (25 kg bags)': [, 8],
      'Shingle bundles': [38, 38], 'Roof underlayment rolls': [110, 110], 'Drip edge (10 ft pieces)': [9], 'Drip edge (3 m pieces)': [, 9],
      'Ridge cap bundles': [60, 60], 'Siding: vinyl': [2.5, 27], 'Siding: fiber cement': [3.5, 38],
      'Wall insulation bags (R-13 batts)': [40, 40], 'Wall insulation bags (R-21 batts)': [55, 55], 'Attic insulation bags (R-38 blown-in)': [15, 15], 'Drywall sheets': [16, 16],
      '1 gallon cans of paint': [40], '2.5 L tins of paint': [, 35],
      'Flooring: laminate or vinyl plank': [3.5, 38], 'Flooring: ceramic or porcelain tile': [3.5, 38], 'Flooring: hardwood': [6, 65], 'Flooring: carpet': [3, 32],
      'Tile adhesive (50 lb bags)': [22], 'Tile adhesive (20 kg bags)': [, 16],
      // Nails, screws and small items (rough US prices; metric nails per kg)
      'Rebar tie wire (3½ lb coils)': [8], 'Rebar tie wire, 1.6 mm (kg)': [, 3], 'Rebar chairs (2 in)': [0.35], 'Rebar chairs (50 mm)': [, 0.35],
      'Anchor bolts (½ × 10 in)': [1.5], 'Anchor bolts (M12 × 250 mm)': [, 1.5], 'Hurricane ties (2 per truss)': [1.2, 1.2],
      'Nails: 16d framing (5 lb boxes)': [18], 'Nails: 90 mm framing (kg)': [, 3.5], 'Nails: 8d sheathing (5 lb boxes)': [17], 'Nails: 65 mm sheathing (kg)': [, 3.5],
      'Nails: 1¼ in roofing (5 lb boxes)': [16], 'Nails: 32 mm roofing (kg)': [, 4], 'Nails: 1½ in galvanized siding (5 lb boxes)': [24], 'Nails: 40 mm galvanized siding (kg)': [, 5],
      'Nails: 2 in finish (5 lb boxes)': [25], 'Nails: 50 mm finish (kg)': [, 5],
      'Construction adhesive, subfloor (tubes)': [6, 6], 'Metal roofing screws (bags of 250)': [30, 30], 'Roof tile nails or clips (boxes of 1,000)': [40, 40],
      'Brick ties': [0.3, 0.3], 'House wrap (9 × 100 ft rolls)': [170], 'House wrap (1.5 × 50 m rolls)': [, 90], 'Wall plugs (tox) with screws (packs of 100)': [12, 12],
      'Drywall screws (boxes of 1,000)': [25, 25], 'Joint compound (4.5 gal buckets)': [18], 'Joint compound (20 kg buckets)': [, 18],
      'Drywall tape (500 ft rolls)': [6], 'Drywall tape (150 m rolls)': [, 6], 'Caulk (tubes)': [6, 6], 'Tile grout (25 lb bags)': [25], 'Tile grout (5 kg bags)': [, 10],
      'Baseboard (8 ft pieces)': [14], 'Baseboard (2.4 m pieces)': [, 14],
    },
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
    'house-material-calculator': {
      L: 'The long side of the building, outside wall to outside wall.',
      W: 'The short side of the building. The roof ridge runs along the length, so the gables are on these ends.',
      stories: 'Two stories doubles the walls and adds upper-floor joists and subfloor. The slab and roof stay the same size.',
      H: 'The height of the walls on the ground floor, usually the ceiling height: 8 or 9 ft (2.4 or 2.7 m).',
      H2: 'The upper floor can have its own ceiling height, often a little lower than the ground floor.',
      roofing: 'Shingles are the cheapest. Metal panels last longer and suit low slopes down to about 3/12. Tiles are heavy, so the roof framing must be built for them.',
      siding: 'Vinyl is the cheapest siding. Fiber cement is tougher and fire-resistant. Stucco or cement render is usual on block walls. Brick veneer is a single layer of brick in front of the wall.',
      floor: 'Each flooring is worked out over the whole floor plus 10%. Tile adds bags of tile adhesive (thinset) and grout.',
      extras: 'Nails, screws, wall plugs (tox), rebar ties and chairs, anchor bolts, hurricane ties, house wrap, drywall tape and compound, caulk and grout, worked out from the build.',
      roof: 'A gable roof has two slopes and triangular end walls. A hip roof slopes on all four sides, so it has no gable walls.',
      pitch: 'How many inches the roof rises for every 12 in across. Most houses are 4/12 to 8/12.',
      over: 'How far the roof sticks out past the walls. 12–18 in (30–45 cm) is common.',
      walls: '2×6 walls are thicker, so they hold more insulation, and many cold-climate codes require them. Concrete block (CMU or hollow block) is common in warm, wet and storm-prone places.',
      spacing: 'The distance between studs, center to center. 16 in is standard; 24 in uses fewer studs.',
      I: 'Add up the length of every inside wall, on all floors. Each wall gets studs, drywall on both sides, paint and baseboard.',
      doors: 'Doors in the outside walls, including the main entry and back door.',
      gdoors: 'Each garage door is taken out of the siding as a 16 × 7 ft opening.',
      idoors: 'Doors between rooms, including closets, on all floors.',
      windows: 'Every window, on all floors. Each one is taken out of the siding and paint as 15 sq ft.',
      fin: 'Finished adds what makes it livable inside. Pick unfinished for a shed, garage or workshop.',
    },
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
