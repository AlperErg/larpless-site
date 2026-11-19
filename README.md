# larpless-site

The website at [larpless.app](https://larpless.app) for [LarpLess](https://github.com/AlperErg/larpless): the landing page, the user guide, the privacy policy and terms, and the update feed the Mac app checks. Vite + TypeScript, hosted on Netlify. It lived in the app repository's `site/` folder until November 2026; its history came along.

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-checks, then writes dist/
```

## Where things come from

- **Guide, privacy policy and terms.** `/guide/`, `/privacy/` and `/terms/` render `GUIDE.md`, `PRIVACY.md` and `TERMS.md` from the [app repository](https://github.com/AlperErg/larpless) at build time, so this repository never holds a copy that could drift. The build fetches them from the app's `main` branch (`LARPLESS_DOCS_REF` picks another branch, tag or commit) and fails if it can't. To edit them with live reload, point `LARPLESS_DOCS` at a local checkout:

  ```bash
  LARPLESS_DOCS=../larpless npm run dev
  ```

  When one of them changes on the app's `main`, its `site-docs` workflow calls a Netlify build hook, so the site picks up the new text.
- **Update feed.** `public/appcast.xml` is the Sparkle feed installed Mac apps check (`https://larpless.app/appcast.xml`). Only the app repository's `scripts/release-mac.sh` writes it, through `scripts/appcast.mjs`, which expects this repository checked out next to `larpless`. Don't edit it by hand. Upload the DMG to the app's GitHub release first, then push the feed here: installed apps start downloading as soon as it's live.

## Deploying

Netlify builds every push to `main`, and a deploy preview for each pull request, from the repository root (`netlify.toml`). `SITE_URL` (else Netlify's `URL`) sets the absolute origin for canonical, Open Graph and sitemap URLs. Visits are counted with Umami, proxied through this domain (`/_v/…` in `netlify.toml` and `netlify/edge-functions/umami-send.js`). The app's `PRIVACY.md` describes that, so change it there whenever the site starts sending or collecting something new.
