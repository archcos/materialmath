# MaterialMath

## Git: the owner pushes, never Claude
- **Never run `git push`**, force-push, or anything else that changes the GitHub repo (github.com/archcos/materialmath). Pushing is only the owner's job.
- Commit only when asked. When work is ready, say so and leave the push to the owner.
- Pushes to `main` will deploy the live site through Cloudflare, so an unplanned push is an unplanned release.

## Commands
- `node test.js`: check every formula
- `node build.js`: build the site into `dist/`
- `node serve.js`: preview at http://localhost:8080
- `node og.js`: remake share images in `src/og/` (needs Edge or Chrome installed)
- `npm run deploy`: test, build and deploy to Cloudflare directly (only when the owner asks)
