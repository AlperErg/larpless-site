import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';
import { defineConfig, type Plugin } from 'vite';

const SITE_DIR = dirname(fileURLToPath(import.meta.url));
/** The app repository, which holds GUIDE.md, PRIVACY.md and TERMS.md next to the code they describe. */
const APP_REPO = 'AlperErg/larpless';
const REPO_URL = `https://github.com/${APP_REPO}/blob/main/`;

/**
 * Where the documents come from: by default the app repository's main branch on GitHub
 * (LARPLESS_DOCS_REF picks another branch, tag or commit). LARPLESS_DOCS=<path to a larpless
 * checkout> reads them from disk instead, and the dev server then reloads when you edit them.
 */
const DOCS_DIR = process.env.LARPLESS_DOCS?.trim() ? resolve(process.env.LARPLESS_DOCS.trim()) : undefined;
const DOCS_REF = process.env.LARPLESS_DOCS_REF?.trim() || 'main';

async function readDoc(file: string): Promise<string> {
  if (DOCS_DIR) return readFile(resolve(DOCS_DIR, file), 'utf8');
  const url = `https://raw.githubusercontent.com/${APP_REPO}/${DOCS_REF}/${file}`;
  const res = await fetch(url);
  // Never publish an empty or error page in place of the privacy policy: fail the build instead.
  if (!res.ok) throw new Error(`legal: ${url} returned ${res.status} ${res.statusText}`);
  return res.text();
}

const ORIGIN_TOKEN = '__SITE_ORIGIN__';

/**
 * Share crawlers ignore a relative og:image, and a canonical URL has to be absolute.
 * Netlify sets URL to the primary site origin at build time. SITE_URL overrides it
 * when the public domain is different from that URL.
 */
function siteOrigin(): string | undefined {
  const raw = (process.env.SITE_URL || process.env.URL)?.trim().replace(/\/$/, '');
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

function applyOrigin(html: string, origin: string | undefined): string {
  if (origin) return html.replaceAll(ORIGIN_TOKEN, origin);

  const stripped = html
    .replace(/\s*<link rel="canonical" href="__SITE_ORIGIN__\/[^"]*"\s*\/?>/g, '')
    .replace(/\s*<meta property="og:url" content="__SITE_ORIGIN__\/[^"]*"\s*\/?>/g, '');
  return scrubLocalSchema(stripped.replaceAll(ORIGIN_TOKEN, '.'));
}

/** Drop absolute-only schema fields when the build has no public origin. */
function scrubLocalSchema(html: string): string {
  return html.replace(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    (_match, body: string) => {
      let data: unknown;
      try {
        data = JSON.parse(body);
      } catch {
        return `<script type="application/ld+json">${body}</script>`;
      }
      const scrub = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(scrub);
        if (!value || typeof value !== 'object') return value;
        const out: Record<string, unknown> = {};
        for (const [key, child] of Object.entries(value)) {
          if (typeof child === 'string' && (child === './' || child.startsWith('./#'))) continue;
          out[key] = scrub(child);
        }
        return out;
      };
      return `<script type="application/ld+json">\n${JSON.stringify(scrub(data), null, 2)}\n    </script>`;
    },
  );
}

function seo(): Plugin {
  const origin = siteOrigin();
  return {
    name: 'seo',
    transformIndexHtml(html) {
      return applyOrigin(html, origin);
    },
    generateBundle() {
      const robots = origin
        ? `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
        : 'User-agent: *\nAllow: /\n';
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
      if (!origin) return;

      const lastmod = new Date().toISOString().slice(0, 10);
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>${origin}/</loc>
    <lastmod>${lastmod}</lastmod>
    <image:image>
      <image:loc>${origin}/home.webp</image:loc>
      <image:caption>LarpLess home screen: Start session, Pomodoro presets, a streak heatmap, and recent sessions</image:caption>
    </image:image>
  </url>
  <url>
    <loc>${origin}/guide/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
  <url>
    <loc>${origin}/privacy/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
  <url>
    <loc>${origin}/terms/</loc>
    <lastmod>${lastmod}</lastmod>
  </url>
</urlset>
`;
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
    },
  };
}

/** The documents the guide and legal pages render, from the app repository's root, and where each lives on the site. */
const LEGAL_PAGES: Record<string, string> = { 'GUIDE.md': '../guide/', 'PRIVACY.md': '../privacy/', 'TERMS.md': '../terms/' };
const LEGAL_MARKER = /<!--\s*legal:([A-Z]+\.md)\s*-->/;

/** GitHub's heading anchors, so links like #downloads-you-start work the same on both. */
function slug(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&[#a-z0-9]+;/gi, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s/g, '-');
}

/** Links between the documents go to their pages; other app repository files go to GitHub. */
function legalHref(href: string): string {
  const [path, hash] = href.split('#');
  if (!path || /^[a-z]+:/i.test(href)) return href;
  const page = LEGAL_PAGES[path];
  if (page) return hash ? `${page}#${hash}` : page;
  return `${REPO_URL}${path}${hash ? `#${hash}` : ''}`;
}

/**
 * HTML that only the site shows, in place of a `<!-- figure:name -->` comment in a document (GitHub
 * hides the comment). Mock-ups drawn from example data, never a screenshot of someone's screen.
 */
const FIGURES: Record<string, string> = {
  modules: `<figure class="mock" aria-label="Mock-up of the Subjects page with three of your own courses">
  <div class="mock-window">
    <div class="mock-title">Your own courses (optional)</div>
    <div class="mock-table" role="table">
      <div class="mock-row mock-head" role="row"><span role="columnheader">Name</span><span role="columnheader">Colour</span><span role="columnheader">Keywords</span></div>
      <div class="mock-row" role="row"><span role="cell">Cell Biology</span><span role="cell"><i class="mock-tag green">green</i></span><span role="cell">BIO101, mitosis, Krebs cycle, organelle</span></div>
      <div class="mock-row" role="row"><span role="cell">Algorithms</span><span role="cell"><i class="mock-tag blue">blue</i></span><span role="cell">CS210, Dijkstra, dynamic programming, Big-O</span></div>
      <div class="mock-row" role="row"><span role="cell">Data Structures</span><span role="cell"><i class="mock-tag purple">purple</i></span><span role="cell">CS220, linked list, hash table, heap</span></div>
      <div class="mock-row mock-new" role="row"><span role="cell">＋ New</span></div>
    </div>
  </div>
  <figcaption>A mock-up of <strong>Subjects → Your own courses</strong> with example courses. Each course has keywords the others don't.</figcaption>
</figure>`,
};
const FIGURE_MARKER = /<!--\s*figure:([a-z-]+)\s*-->/g;

async function renderLegal(file: string): Promise<string> {
  const marked = new Marked({
    gfm: true,
    walkTokens(token) {
      if (token.type === 'link') token.href = legalHref(token.href);
    },
  });
  const html = marked.parse(await readDoc(file), { async: false });
  return html
    .replace(FIGURE_MARKER, (_m, name: string) => {
      const figure = FIGURES[name];
      if (!figure) throw new Error(`legal: unknown figure ${name} in ${file}`);
      return figure;
    })
    .replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_m, depth: string, inner: string) => `<h${depth} id="${slug(inner)}">${inner}</h${depth}>`)
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, '</table></div>');
}

/**
 * /guide/, /privacy/ and /terms/ are GUIDE.md, PRIVACY.md and TERMS.md from the app repository, rendered at build
 * time (and on every request in dev), so the site never holds a second, drifting copy of them. A change to them on
 * the app repository's main branch triggers a Netlify build through its site-docs workflow.
 */
function legal(): Plugin {
  return {
    name: 'legal',
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const file = html.match(LEGAL_MARKER)?.[1];
        if (!file) return html;
        if (!(file in LEGAL_PAGES)) throw new Error(`legal: unknown document ${file}`);
        const rendered = await renderLegal(file);
        return html.replace(LEGAL_MARKER, () => rendered);
      },
    },
    configureServer(server) {
      if (!DOCS_DIR) return;
      const files = Object.keys(LEGAL_PAGES).map((f) => resolve(DOCS_DIR, f));
      server.watcher.add(files);
      server.watcher.on('change', (changed) => {
        if (files.includes(changed)) server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

export default defineConfig({
  base: './',
  server: { port: 5173 },
  plugins: [legal(), seo()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(SITE_DIR, 'index.html'),
        guide: resolve(SITE_DIR, 'guide/index.html'),
        privacy: resolve(SITE_DIR, 'privacy/index.html'),
        terms: resolve(SITE_DIR, 'terms/index.html'),
      },
    },
  },
});
