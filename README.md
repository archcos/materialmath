# MaterialMath

Static site with 20 DIY material calculators. No framework, no dependencies. Only Node.js is needed to build it.

```
node test.js     # check every formula
node build.js    # writes the site to dist/
node serve.js    # preview at http://localhost:8080
node og.js       # remake the share images in src/og/ (uses your installed Edge or Chrome)
```

## Publishing (GitHub → Cloudflare)
The site deploys only through GitHub. Every push to `main` makes Cloudflare run the tests, build the site and deploy it to https://materialmath.org. If a formula test fails, nothing is deployed.

- Cloudflare Worker `materialmath`, imported from `archcos/materialmath`.
- Build command: `npm test && npm run build`. Deploy command: `npx wrangler deploy`.
- Domains and other settings live in `wrangler.jsonc`, so change them there and push.
- The site's domain and contact email are in the `SITE` block in `build.js`.
- `dist/` is built by Cloudflare and is not committed.

## AdSense
1. Wait until the site is live on your domain, then apply at adsense.google.com.
2. When AdSense gives you your publisher ID (`ca-pub-…`), put it in `SITE.adsenseClient` in `build.js` and rebuild.
   This adds the AdSense script to every page and creates `ads.txt` automatically. Turn on **Auto ads** in AdSense to place the ads.
3. Visitors in the EU/UK need a consent banner. In AdSense, open **Privacy & messaging** and enable Google's own consent message.
4. Submit `https://yourdomain/sitemap.xml` in Google Search Console.

## Adding a calculator
1. Add an entry to `CALCS` in `src/formulas.js`.
2. Write its article in `content/<slug>.html`.
3. Add its "what to measure" picture to `DIAGRAMS` in `src/diagrams.js` (the build stops if one is missing).
4. Add its Google title and 4 FAQs to `src/seo.js` (the build stops if they are missing).
5. Optionally add search words to `KEYWORDS` in `build.js` (e.g. "sheetrock" for drywall).
6. Add a check to `test.js`, then run `node test.js && node og.js && node build.js`.
