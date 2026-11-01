'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const {renderPages, renderSitemap, canonicalUrls} = require('../scripts/list-pages.cjs');
const root = path.resolve(__dirname, '..');
const pageFile = url => path.join(root, new URL(url).pathname.slice(1), 'index.html');

test('generated tool pages and sitemap match their sources', () => {
  for (const [file, html] of renderPages(root)) assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), html, 'Run npm run generate: ' + file);
  assert.equal(fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8'), renderSitemap());
});

test('indexable pages have unique metadata, matching canonical URLs and no unresolved template fields', () => {
  const titles = new Set(), descriptions = new Set(), headings = new Set();
  for (const url of canonicalUrls) {
    const html = fs.readFileSync(pageFile(url), 'utf8');
    const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)];
    assert.equal(canonicals.length, 1); assert.equal(canonicals[0][1], url);
    assert(html.includes('<html lang="sv">')); assert(!html.includes('noindex')); assert(!/\{\{\w+\}\}/.test(html));
    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
    const heading = html.match(/<h1[^>]*>([^<]+)<\/h1>/)[1];
    assert(!titles.has(title)); titles.add(title);
    assert(!descriptions.has(description)); descriptions.add(description);
    assert(!headings.has(heading)); headings.add(heading);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const data = JSON.parse(match[1]);
      assert.equal(data['@context'], 'https://schema.org');
      const page = data['@graph'].find(node => node['@type'] === 'WebPage');
      assert.equal(page.url, url); assert.equal(page.name, title);
    }
  }
  assert.equal(canonicalUrls.length, new Set(canonicalUrls).size);
  assert(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8').includes('Sitemap: https://randomisera.se/sitemap.xml'));
});

test('every tool has a crawlable link from the homepage and is included in the offline release', () => {
  const homepage = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const homeLinks = [...homepage.matchAll(/<a[^>]*href="([^"]+)"/g)].map(match => new URL(match[1], 'https://randomisera.se/').href);
  const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  for (const route of ['dela-in-i-grupper/', 'slumpa-lista/', 'slumpa-nummer/', 'singla-slant/', 'ja-eller-nej/', 'kasta-tarning/']) {
    assert(homeLinks.includes('https://randomisera.se/' + route), route);
    assert(worker.includes(JSON.stringify(route)), route);
  }
  for (const url of canonicalUrls) {
    const file = pageFile(url), html = fs.readFileSync(file, 'utf8');
    for (const match of html.matchAll(/<a[^>]*href="([^"]+)"/g)) {
      const href = match[1];
      if (/^(?:[a-z]+:|#)/i.test(href)) continue;
      assert(fs.existsSync(path.resolve(path.dirname(file), href.split('#')[0])), url + ': ' + href);
    }
  }
});
