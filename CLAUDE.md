# MaterialMath

## Git and deploys: the owner does both, never Claude
- **Never run `git push`**, force-push, or anything else that changes the GitHub repo (github.com/archcos/materialmath). Pushing is only the owner's job.
- **Never deploy.** The live site deploys only through GitHub: each push to `main` makes Cloudflare test, build and deploy it. Do not run `wrangler deploy`, `wrangler delete`, or any other command that changes the Cloudflare account.
- Commit only when asked. When work is ready, say so and leave the commit and push to the owner.

## Commands
- `node test.js`: check every formula
- `node build.js`: build the site into `dist/`
- `node serve.js`: preview at http://localhost:8080
- `node og.js`: remake share images in `src/og/` (needs Edge or Chrome installed). Commit the PNGs, because Cloudflare's build machines can't run it.
