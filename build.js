// Builds the static site into dist/. Run: node build.js
const fs = require('fs');
const path = require('path');
const { CALCS, CATS } = require('./src/formulas.js');
const { diagram } = require('./src/diagrams.js');
const { TITLES, FAQS } = require('./src/seo.js');

// ---- Edit these before you publish ----
const SITE = {
  name: 'MaterialMath',
  url: 'https://materialmath.org', // your domain, no trailing slash
  email: 'contact@materialmath.org', // shown on the Contact page; forward it to your inbox with Cloudflare Email Routing
  adsenseClient: '', // e.g. 'ca-pub-1234567890123456' once AdSense gives you one
  policyDate: '2026-11-11', // "Last updated" on the Privacy and Terms pages: change it when you edit their text
};
// ---------------------------------------

const OUT = path.join(__dirname, 'dist');
const year = new Date().getFullYear();
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// Structured data for Google. "<" is escaped so text can never close the <script> tag.
const ldJson = obj => `\n<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...obj }).replace(/</g, '\\u003c')}</script>`;
// Share images come from `node og.js` (src/og/<name>.png); pages fall back to the home image.
const OG = path.join(__dirname, 'src', 'og');
const ogImage = name => `/og/${fs.existsSync(path.join(OG, name + '.png')) ? name : 'home'}.png`;

// Extra words people search for, so "cement" finds the concrete calculators.
const KEYWORDS = {
  'concrete-calculator': 'cement slab patio driveway pour ready mix quikrete bags yards',
  'concrete-column-calculator': 'cement post hole footing sonotube pier deck post fence post',
  'concrete-block-calculator': 'cmu cinder block wall foundation masonry',
  'brick-calculator': 'masonry wall mortar',
  'gravel-calculator': 'stone rock crushed driveway base yards tons',
  'topsoil-calculator': 'dirt soil fill garden lawn yards',
  'mulch-calculator': 'bark garden bed landscaping yards bags',
  'paver-calculator': 'patio walkway stone brick hardscape',
  'sod-calculator': 'grass lawn turf rolls pallets',
  'fence-calculator': 'posts rails pickets privacy fence panels',
  'paint-calculator': 'gallons walls room ceiling primer',
  'tile-calculator': 'floor wall backsplash bathroom shower boxes',
  'flooring-calculator': 'laminate vinyl hardwood lvp floor boxes',
  'drywall-calculator': 'sheetrock gypsum board sheets wall ceiling',
  'baseboard-calculator': 'trim molding moulding linear feet',
  'deck-calculator': 'decking boards composite joists lumber',
  'roofing-calculator': 'shingles squares bundles roof pitch',
  'stair-calculator': 'steps stairs risers treads stringer',
  'board-foot-calculator': 'lumber hardwood wood board feet',
  'square-footage-calculator': 'area sq ft room house measure',
};

const searchForm = id => `<form class="search" role="search" action="/" autocomplete="off">
  <label class="sr" for="q-${id}">Search calculators</label>
  <input id="q-${id}" type="search" name="q" placeholder="Search: concrete, deck, paint…" aria-controls="r-${id}" aria-expanded="false">
  <button type="submit">Search</button>
  <ul id="r-${id}" class="search-results" hidden></ul>
</form>`;

function page({ title, desc, url, body, hero = '', calc = false, image = ogImage('home'), ld = '', noindex = false }) {
  const ads = SITE.adsenseClient
    ? `\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}" crossorigin="anonymous"></script>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>/* set the theme before the page paints, so there is no flash */var t;try{t=localStorage.getItem('mm-theme')}catch(e){}document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')</script>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${noindex ? '\n<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${SITE.url}${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE.url}${url}">
<meta property="og:site_name" content="${SITE.name}">
<meta property="og:image" content="${SITE.url}${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">${ld}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&display=swap">
<link rel="stylesheet" href="/style.css">
<script src="/site.js" defer></script>${ads}
</head>
<body>
<header class="top"><div class="wrap">
  <a class="logo" href="/"><img src="/favicon.svg" alt="" width="34" height="34"><span>Material<b>Math</b></span></a>
  ${searchForm('top')}
  <nav><a href="/#calculators">All calculators</a></nav>
  <a class="proj" href="/project/" data-tip="Your saved calculations, added up into one shopping list and total."><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg><span class="proj-text">My project</span><span class="proj-count" hidden></span></a>
  <button type="button" class="theme" aria-label="Switch to dark theme"><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
</div></header>
${hero}<main class="wrap">
${body}
</main>
<footer><div class="wrap">
  <nav><a href="/about/">About</a><a href="/contact/">Contact</a><a href="/privacy/">Privacy Policy</a><a href="/terms/">Terms</a></nav>
  <p>© ${year} ${SITE.name}. Results are estimates. Check product labels and local building codes before you buy or build.</p>
</div></footer>${calc ? '\n<script src="/formulas.js" defer></script>\n<script src="/calc-ui.js" defer></script>' : ''}
</body>
</html>
`;
}

function write(rel, html) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

fs.rmSync(OUT, { recursive: true, force: true });
for (const f of ['style.css', 'formulas.js', 'calc-ui.js', 'project.js', 'favicon.svg']) write(f, fs.readFileSync(path.join(__dirname, 'src', f)));
if (fs.existsSync(OG)) fs.cpSync(OG, path.join(OUT, 'og'), { recursive: true });
const index = CALCS.map(c => ({ t: c.title, s: c.slug, h: `${c.title} ${CATS[c.cat]} ${c.desc} ${KEYWORDS[c.slug] || ''}`.toLowerCase() }));
write('site.js', `var MM_INDEX = ${JSON.stringify(index)};\n${fs.readFileSync(path.join(__dirname, 'src', 'site.js'), 'utf8')}`);

// Calculator pages
const urls = ['/'];
for (const c of CALCS) {
  const content = fs.readFileSync(path.join(__dirname, 'content', c.slug + '.html'), 'utf8');
  const related = CALCS.filter(o => o.cat === c.cat && o !== c).map(o => `<li><a href="/${o.slug}/">${o.title}</a></li>`).join('');
  const url = `/${c.slug}/`;
  urls.push(url);
  const faqs = FAQS[c.slug];
  if (!TITLES[c.slug] || !faqs) throw new Error(`Add a title and FAQs for ${c.slug} in src/seo.js`);
  const faqHtml = `<section class="faq"><h2>Frequently asked questions</h2>\n${faqs.map(([q, a]) => `<h3>${q}</h3>\n<p>${a}</p>`).join('\n')}\n</section>`;
  const ld = ldJson({ '@graph': [
    { '@type': 'WebApplication', name: c.title, url: SITE.url + url, description: c.desc, applicationCategory: 'UtilitiesApplication', operatingSystem: 'Any', browserRequirements: 'Requires JavaScript', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE.url + '/' }, { '@type': 'ListItem', position: 2, name: c.title, item: SITE.url + url }] },
    { '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
  ] });
  write(`${c.slug}/index.html`, page({
    title: `${TITLES[c.slug]} | ${SITE.name}`, desc: c.desc, url, calc: true, image: ogImage(c.slug), ld,
    body: `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> › <a href="/#${c.cat}">${CATS[c.cat]}</a></nav>
<h1>${c.title}</h1>
<p class="lede">${c.desc}</p>
<div class="tool">
<figure class="diagram">${diagram(c.slug, `Diagram showing what to measure for the ${c.title.toLowerCase()}`)}<figcaption>What to measure</figcaption></figure>
<div id="calc" class="calc" data-slug="${c.slug}"><noscript>Turn on JavaScript to use this calculator.</noscript></div>
</div>
<p class="print-only print-brand"><img src="/favicon.svg" alt="" width="18" height="18"><span>Estimated with <b>${SITE.name}</b> · ${SITE.url.replace(/^https?:\/\//, '')}</span><span class="print-more">Free calculators for concrete, decks, fences, roofing and more. Estimates only: check product labels and local codes.</span></p>
<article class="content">
${content}
${faqHtml}
<p class="note">These results are estimates based on standard formulas and common product sizes. Always check the coverage on the product label, and your local building code, before you buy or build.</p>
</article>
<aside class="related"><h2>Related calculators</h2><ul>${related}</ul></aside>`,
  }));
}

// Home page
const sections = Object.entries(CATS).map(([key, name]) => `<section id="${key}">
<h2>${name}</h2>
<ul class="cards">${CALCS.filter(c => c.cat === key).map(c => `<li><a href="/${c.slug}/"><span class="thumb">${diagram(c.slug)}</span><strong>${c.title}</strong><span class="desc">${c.desc}</span></a></li>`).join('')}</ul>
</section>`).join('\n');
write('index.html', page({
  title: `Free Construction & DIY Material Calculators | ${SITE.name}`,
  desc: 'Free calculators that tell you how much concrete, gravel, paint, tile, drywall, decking and other materials to buy for your project.',
  url: '/',
  ld: ldJson({ '@type': 'WebSite', name: SITE.name, url: SITE.url + '/', description: 'Free construction and DIY material calculators.' }),
  hero: `<section class="hero"><div class="wrap">
<p class="eyebrow">Measure once. Buy right.</p>
<h1>How much material do you need?</h1>
<p class="lede">Free calculators for DIY and contractor jobs. Punch in your measurements in feet and inches (or metric) and get the bags, yards, boards or boxes to buy, with extra for waste.</p>
${searchForm('hero')}
<p class="popular">Popular: ${[['concrete-calculator', 'Concrete'], ['gravel-calculator', 'Gravel'], ['deck-calculator', 'Deck boards'], ['fence-calculator', 'Fence'], ['roofing-calculator', 'Roofing']].map(([s, t]) => `<a href="/${s}/">${t}</a>`).join('')}</p>
<ul class="facts"><li><b>${CALCS.length}</b> calculators</li><li>Feet &amp; inches or metric</li><li>No sign-up, no email</li></ul>
</div></section>`,
  body: `<div id="calculators">${sections}</div>`,
}));

// Info pages
const info = {
  about: ['About', `About ${SITE.name}`, `${SITE.name} makes free material calculators for DIY and home improvement projects.`, `
<p>${SITE.name} is a collection of free calculators that answer one question: how much material do I need to buy? Each calculator turns your measurements into a shopping quantity, such as bags of concrete, gallons of paint, boxes of tile or sheets of drywall.</p>
<h2>How the calculators work</h2>
<p>Every calculator uses standard geometry (area and volume) plus common industry figures, such as the yield of a bag of concrete or the coverage of a gallon of paint. Each page explains its formula and shows a worked example, so you can check the math yourself.</p>
<h2>Use the results as a starting point</h2>
<p>Products vary. Always check the coverage printed on the product you buy, and follow your local building code for structural work. For large or structural projects, talk to a qualified contractor or engineer.</p>
<p>Found a mistake or want a new calculator? <a href="/contact/">Get in touch</a>.</p>`],
  contact: ['Contact', `Contact ${SITE.name}`, `How to contact ${SITE.name}.`, `
<p>Questions, corrections or ideas for a new calculator are welcome.</p>
<p>Email: <a href="mailto:${SITE.email}">${SITE.email}</a></p>
<p>If you are reporting a calculation problem, please include the calculator name and the numbers you entered.</p>`],
  privacy: ['Privacy Policy', 'Privacy Policy', `How ${SITE.name} handles your data, cookies and advertising.`, `
<p>Last updated: ${SITE.policyDate}</p>
<h2>What we collect</h2>
<p>The calculators run entirely in your browser. The numbers you type are not sent to us or stored on our servers.</p>
<p>To save you retyping, your browser's local storage keeps your units (imperial or metric), your light or dark theme, your currency, the prices you type into cost estimates, and the items you add to My project. They stay on your device and are never sent to us. To delete them, clear this site's data in your browser settings, or use <b>Clear project</b> on the My project page.</p>
<h2>Advertising and cookies</h2>
<p>We use Google AdSense to show ads. Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.</p>
<p>You can opt out of personalised advertising by visiting <a href="https://adssettings.google.com/" rel="nofollow">Google Ads Settings</a>. You can also opt out of some third-party vendors' use of cookies for personalised advertising at <a href="https://www.aboutads.info/choices/" rel="nofollow">www.aboutads.info</a>.</p>
<p>Learn more about <a href="https://policies.google.com/technologies/partner-sites" rel="nofollow">how Google uses information from sites that use its services</a>.</p>
<h2>Fonts</h2>
<p>Our pages load a font from Google Fonts. Your browser connects to Google's servers to download it, which shares your IP address with Google.</p>
<h2>Server logs</h2>
<p>Like most websites, our hosting provider may keep standard server logs (such as IP address, browser type and pages visited) for security and performance.</p>
<h2>Contact</h2>
<p>Questions about this policy: <a href="mailto:${SITE.email}">${SITE.email}</a>.</p>`],
  terms: ['Terms of Use', 'Terms of Use', `Terms for using ${SITE.name}.`, `
<p>Last updated: ${SITE.policyDate}</p>
<p>${SITE.name} provides calculators for general estimating only. Results depend on the numbers you enter and on typical product sizes and coverage rates, which may differ from the products you buy.</p>
<p>The site is provided "as is", without warranties of any kind. We are not responsible for losses, extra costs or damage arising from use of these results. Check product labels and local building codes, and consult a qualified professional for structural, electrical or safety-critical work.</p>
<p>We may change or remove calculators and these terms at any time.</p>`],
};
for (const [slug, [nav, h1, desc, body]] of Object.entries(info)) {
  urls.push(`/${slug}/`);
  write(`${slug}/index.html`, page({ title: `${nav} | ${SITE.name}`, desc, url: `/${slug}/`, body: `<h1>${h1}</h1>\n<article class="content">${body}</article>` }));
}
// Project page: personal to each visitor's browser, so it is kept out of Google and the sitemap.
write('project/index.html', page({
  title: `My Project | ${SITE.name}`, desc: 'Your saved calculations, combined into one shopping list and total.', url: '/project/', noindex: true,
  body: `<h1>My project</h1>
<p class="lede">Everything you added with <b>+ Add to project</b>, combined into one shopping list and total. It is saved in this browser only.</p>
<div id="project" class="calc project"><noscript>Turn on JavaScript to see your project.</noscript></div>
<p class="print-only print-brand"><img src="/favicon.svg" alt="" width="18" height="18"><span>Estimated with <b>${SITE.name}</b> · ${SITE.url.replace(/^https?:\/\//, '')}</span></p>
<script src="/project.js" defer></script>`,
}));
write('404.html', page({ title: `Page not found | ${SITE.name}`, desc: 'Page not found.', url: '/404.html', noindex: true, body: '<h1>Page not found</h1><p>That page does not exist. <a href="/">See all calculators</a>.</p>' }));

// SEO + AdSense files. No <lastmod>: a build date on every page each push is wrong, and Google ignores it once it learns that.
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${SITE.url}${u}</loc></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
if (SITE.adsenseClient) write('ads.txt', `google.com, ${SITE.adsenseClient.replace('ca-', '')}, DIRECT, f08c47fec0942fa0\n`);

console.log(`Built ${urls.length} pages into dist/`);
