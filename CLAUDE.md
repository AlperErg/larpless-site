# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The website at larpless.app for LarpLess, a study tracker whose app lives in [AlperErg/larpless](https://github.com/AlperErg/larpless). Vite 6 + TypeScript, no framework, hosted on Netlify. It moved here from that repository's `site/` folder with its history, so older commit messages also describe app changes.

## Commands

```bash
npm install
npm run dev       # Vite on 5173
npm run build     # tsc --noEmit, then vite build into dist/
npm run preview
LARPLESS_DOCS=../larpless npm run dev   # render the docs from a local app checkout, reloading on edits
```

## Layout

- `index.html`, `src/main.ts`, `src/style.css`: the landing page. `guide/`, `privacy/` and `terms/` hold page shells with a `<!-- legal:FILE.md -->` marker (styled by `src/legal.css`).
- `vite.config.ts`:
  - `legal()` replaces the marker with `GUIDE.md`, `PRIVACY.md` or `TERMS.md` rendered by marked. It fetches them from the app repository's `main` on raw.githubusercontent.com (`LARPLESS_DOCS_REF` for another ref; `LARPLESS_DOCS=<checkout>` reads and watches them on disk) and fails the build rather than publish without them. Links between the three documents go to their pages, other relative links to the app repository on GitHub; `<!-- figure:name -->` markers become the mock-ups in `FIGURES`. Heading ids use GitHub's slug, which the app's `__tests__/ui/links.test.tsx` mirrors for its guide anchors.
  - `seo()` fills `__SITE_ORIGIN__` from `SITE_URL`/`URL` and writes `robots.txt` and `sitemap.xml`. A new page goes into the sitemap and `build.rollupOptions.input`.
- `public/appcast.xml`: the Sparkle update feed (`https://larpless.app/appcast.xml`). Only the app repository's `scripts/appcast.mjs` (run by `scripts/release-mac.sh`) writes it; never edit it by hand.
- `netlify.toml`, `netlify/edge-functions/umami-send.js`: build settings, redirects and the Umami proxy.

## Rules

- Never add a copy of `GUIDE.md`, `PRIVACY.md` or `TERMS.md` here; change them in the app repository. Its `site-docs` workflow triggers a Netlify build when they change on `main`.
- The site sets no cookies, has no forms and serves its own fonts (`@fontsource`), and `PRIVACY.md` promises that. A new analytics event, third-party request or form needs a `PRIVACY.md` change in the app repository too.
- The app's dark theme (`src/ui/theme.ts` there) mirrors this site's palette in `src/style.css`.
