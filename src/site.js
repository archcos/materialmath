// Site-wide scripts: the saved project, the light/dark switch and calculator search.

// The project ("Add to project" on calculators) lives in this browser's localStorage.
window.MMProject = {
  get() { try { return JSON.parse(localStorage.getItem('mm-project')) || []; } catch (e) { return []; } },
  save(list) {
    try { localStorage.setItem('mm-project', JSON.stringify(list)); } catch (e) {}
    dispatchEvent(new Event('mm-project'));
  },
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
