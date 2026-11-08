// Search titles and FAQs, used by build.js only.
// TITLES lead with the phrase people type into Google; the visible H1 stays the calculator's own name.
// FAQ answers may contain simple HTML links; they go into the page and into the FAQPage structured data.
const a = (slug, text) => `<a href="/${slug}/">${text}</a>`;

const TITLES = {
  'concrete-calculator': 'Concrete Calculator: Slab Bags & Cubic Yards',
  'concrete-column-calculator': 'Post Hole Concrete Calculator (Sonotube & Columns)',
  'concrete-block-calculator': 'Concrete Block Calculator: CMU & Cinder Blocks',
  'brick-calculator': 'Brick Calculator: How Many Bricks for a Wall',
  'gravel-calculator': 'Gravel Calculator: Cubic Yards & Tons',
  'topsoil-calculator': 'Topsoil Calculator: Cubic Yards & Tons',
  'mulch-calculator': 'Mulch Calculator: Cubic Yards & Bags',
  'paver-calculator': 'Paver Calculator: How Many Pavers Do I Need?',
  'sod-calculator': 'Sod Calculator: Square Feet, Pieces & Pallets',
  'fence-calculator': 'Fence Calculator: Posts, Panels & Rails',
  'paint-calculator': 'Paint Calculator: How Many Gallons for a Room',
  'tile-calculator': 'Tile Calculator: Tiles & Boxes Needed',
  'flooring-calculator': 'Flooring Calculator: Laminate, Vinyl & Hardwood',
  'drywall-calculator': 'Drywall Calculator: Sheets & Screws for a Room',
  'baseboard-calculator': 'Baseboard Calculator: Linear Feet & Pieces',
  'deck-calculator': 'Deck Calculator: Deck Boards & Joists',
  'roofing-calculator': 'Roofing Calculator: Squares & Shingle Bundles',
  'stair-calculator': 'Stair Calculator: Risers, Treads & Stringers',
  'board-foot-calculator': 'Board Foot Calculator for Lumber',
  'square-footage-calculator': 'Square Footage Calculator (Sq Ft & m²)',
};

const FAQS = {
  'concrete-calculator': [
    ['How many 80 lb bags of concrete make a cubic yard?', 'An 80 lb bag makes about 0.6 cu ft, and a cubic yard is 27 cu ft, so you need about 45 bags. With 60 lb bags it takes about 60, and with 40 lb bags about 90.'],
    ['Is it cheaper to use bags or ready-mix concrete?', 'For jobs under about 1 cubic yard, bags are usually cheaper and simpler. Above that, a ready-mix truck usually saves money and a lot of labor. Many suppliers add a short-load fee for small orders, so ask for the full delivered price.'],
    ['Do I need gravel under a concrete slab?', `Most slabs sit on about 4 in of compacted gravel. It drains water away and gives the slab an even, firm base. Use the ${a('gravel-calculator', 'Gravel Calculator')} to work out the base.`],
    ['How long before I can walk or drive on new concrete?', 'You can usually walk on it after 24 to 48 hours and drive a car on it after about 7 days. Concrete reaches its full design strength after about 28 days.'],
  ],
  'concrete-column-calculator': [
    ['How many bags of concrete do I need per fence post?', 'A 4×4 post in a 10 in wide, 3 ft deep hole needs about 1.4 cu ft of concrete. With 10% extra, that is three 80 lb bags per post.'],
    ['Should I use fast-setting concrete for fence posts?', 'Fast-setting post mix is poured dry into the hole and then soaked with water, and it sets in under an hour. It is quicker for a few posts. Regular concrete is stronger and cheaper per cubic foot, but you have to mix it first.'],
    ['How deep should a fence post hole be?', 'A common rule is one third to one half of the post height above ground, and at least 2 ft. In cold climates, dig below the frost line so the post is not pushed up in winter.'],
    ['Should I put gravel at the bottom of a post hole?', 'Yes. A few inches of gravel under the post lets water drain away from the end of the post, which slows rot.'],
  ],
  'concrete-block-calculator': [
    ['How many concrete blocks are in a square foot?', 'A standard 8 × 8 × 16 in block covers about 0.89 sq ft of wall including the mortar joint. That is about 1.125 blocks per square foot, or 113 blocks per 100 sq ft.'],
    ['Are cinder blocks and concrete blocks the same?', 'They are the same size and are used the same way. True cinder blocks were made with coal ash and are rarely made today. Almost every block sold now is a concrete masonry unit (CMU).'],
    ['Does a concrete block wall need rebar?', 'Retaining walls and load-bearing walls usually need vertical rebar set in grout-filled cells. Low garden walls often do not. The spacing depends on the wall height and your local building code.'],
    ['How do I allow for corners and openings?', 'The calculator works from the total wall area, and the waste allowance covers cut blocks. For a wall with many corners, doors or windows, raise the waste to 10%.'],
  ],
  'brick-calculator': [
    ['How many bricks are in a square foot?', 'US modular bricks laid with ⅜ in mortar joints need about 6.75 bricks per square foot of wall, one brick thick. That is 675 bricks per 100 sq ft.'],
    ['What is the difference between modular and standard bricks?', 'Modular bricks are 7⅝ in long, so three courses with mortar line up with an 8 in block. Standard bricks are a little longer at 8 in. Check the size printed on the pallet before you calculate.'],
    ['How many bricks come on a pallet?', 'Often around 500, but it varies by maker and brick size, so ask your supplier. Divide the number of bricks you need by the bricks per pallet and round up.'],
    ['Why should I buy all my bricks at once?', 'Brick color varies between production runs. Buying everything from one batch, with 5–10% extra for breakage and cuts, keeps the wall an even color.'],
  ],
  'gravel-calculator': [
    ['How much does a cubic yard of gravel weigh?', 'Most crushed stone and gravel weighs about 1.4 tons (2,800 lb) per cubic yard. Wet gravel and stone with a lot of fines can weigh more.'],
    ['How much gravel can my pickup carry?', 'A half-ton pickup can usually carry about half a cubic yard of gravel, which is around 1,400 lb. Check the payload on the sticker inside the driver\'s door before you load up.'],
    ['What kind of gravel is best for a driveway?', 'Crushed, angular stone (such as crusher run, also called road base or dense grade) locks together and stays in place. Round pea gravel rolls and shifts under tires, so it suits paths and drainage better.'],
    ['Should I put landscape fabric under gravel?', 'For paths and patios, yes. Fabric stops the gravel from sinking into the soil and slows weeds. For driveways, a thick base of compacted crushed stone matters more.'],
  ],
  'topsoil-calculator': [
    ['How much does a cubic yard of topsoil weigh?', 'Dry topsoil weighs roughly 1 to 1.2 tons per cubic yard. Wet soil can weigh noticeably more.'],
    ['How many bags of topsoil make a cubic yard?', 'A cubic yard is 27 cu ft. That is 36 bags of 0.75 cu ft, or 27 bags of 1 cu ft. For more than a yard or two, bulk delivery is usually cheaper.'],
    ['What is the difference between topsoil and garden soil?', 'Topsoil is screened soil for filling low spots, leveling and new lawns. Garden soil and raised bed mix have compost and other material added, which makes them better for growing vegetables and flowers.'],
    ['How much does topsoil settle?', 'Loose soil settles as rain and watering pack it down, often by 10–20%. Add a little extra so the finished level ends up where you want it.'],
  ],
  'mulch-calculator': [
    ['How many bags of mulch are in a cubic yard?', 'A cubic yard is 27 cu ft. That is 13.5 bags of 2 cu ft, or 9 bags of 3 cu ft.'],
    ['How much area does a yard of mulch cover?', 'One cubic yard covers about 324 sq ft at 1 in deep, 162 sq ft at 2 in, and 108 sq ft at 3 in.'],
    ['Should I remove old mulch before adding new?', 'Usually not. If the old layer is thin, just top it up to 2–3 in in total. If it is already deep, loosen it or rake some out. Keep mulch a few inches away from tree trunks and stems.'],
    ['Is bulk mulch cheaper than bags?', 'Above two or three cubic yards, bulk is usually cheaper even with a delivery fee. Bags are easier for small beds and fit in any vehicle.'],
  ],
  'paver-calculator': [
    ['How many pavers are in a square foot?', 'For 4 × 8 in pavers, about 4.5 per square foot. For 6 × 6 in pavers, 4 per square foot. For 12 × 12 in pavers, 1 per square foot.'],
    ['What base goes under pavers?', `Patios and walkways usually get 4–6 in of compacted gravel and then about 1 in of bedding sand. Driveways need a thicker base. Use the ${a('gravel-calculator', 'Gravel Calculator')} to work out the base.`],
    ['Do pavers need edge restraints?', 'Yes. Plastic or metal edging, or a concrete border, stops the pavers from spreading apart at the edges over time.'],
    ['Are pavers better than a concrete patio?', 'Pavers usually cost more up front. They do not crack as one slab, and you can lift and relay a few if the ground settles. A poured concrete patio is cheaper per square foot but is harder to repair.'],
  ],
  'sod-calculator': [
    ['How many square feet are in a pallet of sod?', 'Usually between 400 and 500 sq ft, depending on the farm. The calculator assumes about 450 sq ft, so check with your supplier.'],
    ['How big is a piece of sod?', 'Sizes vary. Small slabs are often 16 × 24 in, and rolls are often 2 × 5 ft (10 sq ft). The calculator counts 10 sq ft pieces.'],
    ['When is the best time to lay sod?', 'For cool-season grass (like fescue and bluegrass), early fall or spring. For warm-season grass (like Bermuda, zoysia and St. Augustine), late spring to early summer.'],
    ['How soon can I walk on new sod?', 'Stay off it as much as possible for about two weeks while the roots grow into the soil. Water it every day during that time unless it rains.'],
  ],
  'fence-calculator': [
    ['How far apart should fence posts be?', 'Most wood fences use posts 6–8 ft apart, measured center to center, and no more than 8 ft. Vinyl and metal panels come in fixed widths, so use the panel width as the spacing.'],
    ['How deep should fence posts be set?', `One third to one half of the post height above ground, at least 2 ft, and below the frost line in cold areas. The ${a('concrete-column-calculator', 'Post Hole Concrete Calculator')} works out the concrete per post.`],
    ['What kind of wood should I use for fence posts?', 'Use pressure-treated posts labeled for ground contact. Lumber treated only for above-ground use rots much sooner when it is buried.'],
    ['How do I keep a fence line straight?', 'Set the corner and end posts first. Stretch a string line between them and set every other post to the string.'],
  ],
  'paint-calculator': [
    ['How much area does a gallon of paint cover?', 'About 350–400 sq ft per coat on smooth, primed walls. Rough, porous or bare surfaces soak up more paint, so you get less coverage.'],
    ['Do I need primer?', 'Yes for bare drywall, patched spots, stains and big color changes. Paint-and-primer products help with color changes, but they do not replace a real primer on new drywall.'],
    ['How much paint do I need for a 12 × 12 room?', 'With 8 ft walls, one door and two windows, there is about 334 sq ft of wall. Two coats need about 2 gallons.'],
    ['Should I buy single gallons or a 5-gallon bucket?', 'If you need 4 gallons or more, a 5-gallon bucket is usually cheaper per gallon, and all the paint is one even color.'],
  ],
  'tile-calculator': [
    ['How many tiles are in a square foot?', 'One 12 × 12 in tile, four 6 × 6 in tiles, or half of a 12 × 24 in tile.'],
    ['Does the calculator allow for grout lines?', 'No. It uses the tile size alone, which slightly overestimates the count. The waste allowance covers the difference.'],
    ['Should all my tile boxes come from the same lot?', 'Yes. Color and size can vary between production runs. Check that the lot or shade numbers on every box match before you start.'],
    ['Should I keep spare tiles?', 'Keep at least a few spare tiles after the job. If one cracks later, the same tile may no longer be sold.'],
  ],
  'flooring-calculator': [
    ['How do I measure a room with a closet or alcove?', 'Measure each rectangle separately, work out its area, and add them up. Include closets if the flooring goes into them.'],
    ['Do I need underlayment?', 'Most laminate needs a foam underlayment unless one is already attached to the boards. Many vinyl planks have one attached. Follow the manufacturer\'s instructions, because the wrong underlayment can void the warranty.'],
    ['Which direction should flooring run?', 'Usually along the longest wall, or toward the main window or entry, so the room looks longer. Solid hardwood is usually laid across the floor joists.'],
    ['Should I keep leftover flooring?', 'Keep at least one full box for repairs. Flooring styles are often discontinued, and a matching box can be impossible to find later.'],
  ],
  'drywall-calculator': [
    ['What thickness of drywall should I use?', '½ in is standard for walls. ⅝ in Type X is used where fire-rated walls are required, such as between a garage and the house, and on ceilings with joists 24 in apart.'],
    ['How much does a sheet of drywall weigh?', 'A standard ½ in 4 × 8 sheet weighs about 50 lb, and lightweight versions about 40 lb. A ⅝ in sheet weighs about 70 lb.'],
    ['Should I hang drywall horizontally or vertically?', 'On walls, hanging the sheets horizontally (long edges across the studs) usually means fewer seams to tape and a stronger wall.'],
    ['How many screws do I need per sheet?', 'About 32 screws for a 4 × 8 sheet, which is roughly one per square foot. Space them closer on ceilings than on walls.'],
  ],
  'baseboard-calculator': [
    ['What height of baseboard should I use?', 'Most homes use 3¼ to 5¼ in baseboard. Taller baseboard suits rooms with high ceilings.'],
    ['Should I use MDF or wood baseboard?', 'MDF is cheaper and paints well, but it swells if it gets wet. Use pine or poplar if you want to stain it, and PVC in bathrooms and other damp rooms.'],
    ['Should I cope or miter inside corners?', 'Coped inside corners stay tight even when walls are not square or the house moves. Outside corners are mitered at 45°.'],
    ['How do I calculate baseboard for several rooms?', 'Run the calculator for each room and add the pieces together. Buying longer pieces means fewer joints.'],
  ],
  'deck-calculator': [
    ['How much gap should I leave between deck boards?', 'About ⅛ in for dry wood. Wet pressure-treated boards are often laid tight because they shrink as they dry. For composite, follow the manufacturer\'s spacing.'],
    ['How many deck screws do I need?', 'Two screws wherever a board crosses a joist. For 5½ in boards on joists 16 in apart, that is roughly 350–400 screws per 100 sq ft.'],
    ['Should I use pressure-treated wood or composite?', 'Pressure-treated wood costs less up front but needs regular sealing or staining. Composite costs more but needs little upkeep and does not splinter.'],
    ['Do I need a permit to build a deck?', 'Usually yes if the deck is attached to the house or more than 30 in off the ground. Check with your local building department before you buy materials.'],
  ],
  'roofing-calculator': [
    ['What is a roofing square?', 'A square is 100 sq ft of roof surface. Shingles are priced and sold by the square.'],
    ['How many bundles of shingles are in a square?', 'Three bundles for most 3-tab and architectural shingles. Some heavy designer shingles take four or five, so check the wrapper.'],
    ['How do I find my roof pitch?', 'In the attic, hold a level flat against the underside of a rafter. Mark 12 in along the level, then measure straight up from that mark to the rafter. That number is the rise, so 6 in means a 6/12 pitch.'],
    ['How many roofing nails do I need per square?', 'About 320 nails per square at 4 nails per shingle, or about 480 in high-wind areas where 6 nails per shingle are required.'],
  ],
  'stair-calculator': [
    ['How many stringers do I need?', 'Most stairs up to 36 in wide use three stringers. Wider stairs need one more for roughly every extra 16 in of width.'],
    ['What lumber should I use for stringers?', 'Use 2 × 12 boards. After the notches are cut, there should still be at least 3½ in of solid wood below them.'],
    ['Why is there one fewer tread than risers?', 'The upper floor serves as the top step, so it does not need a tread of its own.'],
    ['Do deck stairs follow the same rules?', 'Yes. The same riser and tread limits apply outdoors, and a handrail is required once the stairs have four or more risers.'],
  ],
  'board-foot-calculator': [
    ['How many board feet are in a 2 × 4 × 8?', 'Using nominal sizes, 2 × 4 × 8 ÷ 12 = 5.33 board feet.'],
    ['Why is hardwood sold by the board foot?', 'Rough hardwood comes in random widths and lengths, so pricing by volume is fairer. Softwood framing lumber is usually sold by the piece.'],
    ['What does 4/4 or 8/4 mean?', 'Hardwood thickness is measured in quarters of an inch. 4/4 ("four quarter") is 1 in thick rough, and 8/4 is 2 in.'],
    ['What is the difference between a board foot and a linear foot?', 'A linear foot is just length. A board foot is a volume: 144 cubic inches, such as a board 1 in thick, 12 in wide and 12 in long.'],
  ],
  'square-footage-calculator': [
    ['How many square feet is a 12 × 12 room?', '12 × 12 = 144 sq ft.'],
    ['How do I convert square feet to square yards?', 'Divide by 9, because a square yard is 3 ft × 3 ft. Carpet is often priced by the square yard.'],
    ['How do I convert square feet to square meters?', 'Multiply by 0.0929. For example, 144 sq ft is about 13.4 m².'],
    ['Does a home\'s square footage include the garage?', 'Usually not. In US listings, square footage normally counts finished, heated living space and leaves out garages, unfinished basements and porches.'],
  ],
};

module.exports = { TITLES, FAQS };
