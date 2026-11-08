// Site-wide scripts: the saved project, the light/dark switch and calculator search.

// The project ("Add to project" on calculators) lives in this browser's localStorage.
window.MMProject = {
  get() { try { return JSON.parse(localStorage.getItem('mm-project')) || []; } catch (e) { return []; } },
  save(list) {
    try { localStorage.setItem('mm-project', JSON.stringify(list)); } catch (e) {}
    dispatchEvent(new Event('mm-project'));
  },
};
// Region, currency and default units, guessed from the browser's language setting (en-GB -> GB).
// No location lookup: it's free, private and works offline. Visitors can override both, and the choice is remembered.
window.MMLocale = (function () {
  const tag = (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';
  let region = '';
  try { region = new Intl.Locale(tag).region || ''; } catch (e) {}
  const EURO = 'AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK'.split(' ');
  // Country -> currency for the bigger markets; anywhere else falls back to USD, but without US prices (see usPrices).
  const BY_REGION = Object.fromEntries(('US USD,CA CAD,GB GBP,AU AUD,NZ NZD,IN INR,PH PHP,ZA ZAR,SG SGD,JP JPY,CN CNY,HK HKD,TW TWD,'
    + 'KR KRW,MX MXN,BR BRL,AR ARS,CL CLP,CO COP,PE PEN,CH CHF,SE SEK,NO NOK,DK DKK,PL PLN,CZ CZK,HU HUF,RO RON,TR TRY,IL ILS,'
    + 'AE AED,SA SAR,QA QAR,KW KWD,EG EGP,NG NGN,KE KES,GH GHS,MA MAD,PK PKR,BD BDT,LK LKR,ID IDR,MY MYR,TH THB,VN VND,UA UAH,'
    + 'RU RUB,IS ISK,JM JMD,TT TTD,DO DOP,CR CRC,GT GTQ,UY UYU').split(',').map(p => p.split(' ')));
  const guess = BY_REGION[region] || (EURO.includes(region) ? 'EUR' : 'USD');
  // Currencies in use today (ISO 4217), for the picker.
  const ALL = ('USD EUR GBP CAD AUD NZD AED AFN ALL AMD AOA ARS AWG AZN BAM BBD BDT BHD BIF BMD BND BOB BRL BSD BTN BWP BYN BZD CDF '
    + 'CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB FJD FKP GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR '
    + 'IQD IRR ISK JMD JOD JPY KES KGS KHR KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR '
    + 'MWK MXN MYR MZN NAD NGN NIO NOK NPR OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR SBD SCR SDG SEK SGD SHP SLE SOS '
    + 'SRD SSP STN SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS UAH UGX UYU UZS VES VND VUV WST XAF XCD XCG XOF XPF YER ZAR ZMW ZWG').split(' ');
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const fmt = cur => new Intl.NumberFormat('en-US', { style: 'currency', currency: cur });
  let names = null;
  try { names = new Intl.DisplayNames(['en'], { type: 'currency' }); } catch (e) {}
  return {
    currencies: ALL,
    // Picker text, e.g. "GBP · British Pound (£)"; typing any part of it finds the currency.
    label(cur) { const s = this.symbol(cur); return `${cur} · ${this.name(cur)}${s !== cur ? ` (${s})` : ''}`; },
    // Reads a currency code back from what was typed or picked ("gbp", "GBP · British Pound"); null if unknown.
    parse: text => { const c = String(text).trim().slice(0, 3).toUpperCase(); return ALL.includes(c) ? c : null; },
    currency: () => read('mm-cur') || guess,
    // The default prices are US store prices: pre-fill them only for US visitors, or anyone who picked US dollars,
    // not for regions that merely fall back to USD (in Mexico "$" means pesos).
    usPrices: cur => cur === 'USD' && (!region || region === 'US' || read('mm-cur') === 'USD'),
    setCurrency(cur) { try { localStorage.setItem('mm-cur', cur); } catch (e) {} },
    // Imperial for the US and Canada (Canadian building trades work in feet and inches) and when the region is unknown.
    sys: () => read('mm-sys') || (!region || ['US', 'CA', 'LR', 'MM'].includes(region) ? 'imp' : 'met'),
    money: (x, cur) => fmt(cur).format(x),
    symbol: cur => fmt(cur).formatToParts(0).find(p => p.type === 'currency').value,
    name: cur => (names ? names.of(cur) : cur),
  };
})();

// Copies text for the Copy buttons; resolves true if it worked.
window.MMCopy = async text => {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) {
    // older browsers and in-app browsers (like Facebook's) block the Clipboard API; fall back to a hidden textarea
    const t = Object.assign(document.createElement('textarea'), { value: text });
    t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t);
    t.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e2) {}
    t.remove();
    return ok;
  }
};

(function () {
  const badge = document.querySelector('.proj-count');
  if (!badge) return;
  const paint = () => { const n = MMProject.get().length; badge.textContent = n; badge.hidden = !n; };
  addEventListener('mm-project', paint);
  addEventListener('storage', e => { if (e.key === 'mm-project') paint(); }); // another tab changed it
  paint();
})();

// Theme switch. The starting theme is set by the inline script in <head>.
(function () {
  const root = document.documentElement, btn = document.querySelector('.theme');
  if (!btn) return;
  const label = () => btn.setAttribute('aria-label', `Switch to ${root.dataset.theme === 'dark' ? 'light' : 'dark'} theme`);
  btn.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('mm-theme', root.dataset.theme); } catch (e) {}
    label();
  });
  label();
})();

// Calculator search for every <form class="search">. build.js prepends MM_INDEX: [{t: title, s: slug, h: searchable text}].
(function () {
  // "pavers" should match "paver"; very short words keep their s ("gas")
  const words = q => q.toLowerCase().split(/\s+/).filter(Boolean).map(w => (w.length > 3 ? w.replace(/s$/, '') : w));
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  document.querySelectorAll('form.search').forEach(form => {
    const input = form.querySelector('input'), list = form.querySelector('.search-results');
    let hits = [];

    function render() {
      const q = words(input.value);
      hits = q.length ? MM_INDEX.filter(c => q.every(w => c.h.includes(w))).slice(0, 8) : [];
      list.innerHTML = hits.map(c => `<li><a href="/${c.s}/">${esc(c.t)}</a></li>`).join('')
        || (q.length ? '<li class="none">No calculator found. Try "concrete", "deck" or "paint".</li>' : '');
      list.hidden = !q.length;
      input.setAttribute('aria-expanded', String(!list.hidden));
    }
    const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); };

    input.addEventListener('input', render);
    input.addEventListener('focus', () => input.value && render());
    form.addEventListener('submit', e => { e.preventDefault(); if (hits[0]) location.href = `/${hits[0].s}/`; });
    form.addEventListener('keydown', e => {
      const links = [...list.querySelectorAll('a')], n = links.indexOf(document.activeElement);
      if (e.key === 'Escape') { close(); input.focus(); }
      else if (e.key === 'ArrowDown' && links.length) { e.preventDefault(); links[(n + 1) % links.length].focus(); }
      else if (e.key === 'ArrowUp' && links.length) { e.preventDefault(); n <= 0 ? input.focus() : links[n - 1].focus(); }
    });
    document.addEventListener('click', e => { if (!form.contains(e.target)) close(); });
  });

  // Fill the box from ?q= (the form's no-JS fallback lands here)
  const q = new URLSearchParams(location.search).get('q'), first = document.querySelector('.hero .search input') || document.querySelector('.search input');
  if (q && first) { first.value = q; first.dispatchEvent(new Event('input')); first.focus(); }
})();
