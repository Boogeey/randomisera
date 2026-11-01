'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {listContent, decisionContent, toolLinks} = require('../assets/tool-content.js');

const listPages = [
  {
    "file": "index.html",
    "base": "./",
    "mode": "choose",
    "title": "Slumpa namn, grupper och turordning | Randomisera.se",
    "description": "Slumpa namn eller välj mellan egna alternativ. Skapa grupper, blanda en lista och spara namnlistor i webbläsaren. Gratis och utan reklam.",
    "canonical": "https://randomisera.se/"
  },
  {
    "file": "dela-in-i-grupper/index.html",
    "base": "../",
    "mode": "groups",
    "title": "Dela in i grupper och slumpa lag | Randomisera.se",
    "description": "Dela in namn i slumpmässiga grupper eller lag. Välj antal grupper eller max personer per grupp och se fördelningen direkt. Gratis och utan konto.",
    "canonical": "https://randomisera.se/dela-in-i-grupper/"
  },
  {
    "file": "slumpa-lista/index.html",
    "base": "../",
    "mode": "list",
    "title": "Blanda en lista och slumpa turordning | Randomisera.se",
    "description": "Blanda namn eller egna alternativ i slumpmässig ordning. Skapa en numrerad turordning för presentationer, spel eller uppgifter och kopiera resultatet.",
    "canonical": "https://randomisera.se/slumpa-lista/"
  }
];
const decisionPages = [
  {
    "file": "singla-slant/index.html",
    "base": "../",
    "decision": "coin",
    "title": "Singla slant – krona eller klave online | Randomisera.se",
    "description": "Singla en digital slant och få krona eller klave. Avgör vem som börjar eller välj mellan två alternativ. Gratis, utan reklam och utan konto.",
    "canonical": "https://randomisera.se/singla-slant/",
    "action": "Singla slant"
  },
  {
    "file": "ja-eller-nej/index.html",
    "base": "../",
    "decision": "yes",
    "title": "Ja eller nej – slumpa ett svar | Randomisera.se",
    "description": "Slumpa ja eller nej till en enkel fråga. Få ett tydligt svar direkt och slumpa igen när du vill. Gratis, utan reklam och utan konto.",
    "canonical": "https://randomisera.se/ja-eller-nej/",
    "action": "Slumpa ja eller nej"
  },
  {
    "file": "kasta-tarning/index.html",
    "base": "../",
    "decision": "dice",
    "title": "Kasta tärning online – d4 till d100 | Randomisera.se",
    "description": "Kasta 1–100 tärningar med 4, 6, 8, 10, 12, 20 eller 100 sidor. Se summan, lås valda tärningar och kasta om resten. Gratis och utan reklam.",
    "canonical": "https://randomisera.se/kasta-tarning/",
    "action": "Kasta tärningarna"
  }
];
const otherPages = [
  {canonical: 'https://randomisera.se/slumpa-nummer/', label: 'Slumpa nummer'},
  {canonical: 'https://randomisera.se/lagring-och-integritet/'},
  {canonical: 'https://randomisera.se/app/'}
];
const tools = toolLinks.map(tool => ({...tool, canonical: 'https://randomisera.se/' + tool.path}));
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

function useCases(page) {
  const content = listContent[page.mode] || decisionContent[page.decision] || page;
  const links = tools.filter(tool => tool.canonical !== page.canonical).map(tool => {
    const pathname = new URL(tool.canonical).pathname.slice(1);
    return `<a href="${page.base}${pathname}${tool.fragment}">${tool.label}</a>`;
  }).join('');
  return `<section id="tool-description" class="tool-description" data-base="${page.base}" aria-labelledby="use-cases-title"><h2 id="use-cases-title">${content.detailTitle}</h2><div id="use-cases-paragraphs">${content.paragraphs.map(text => '<p>' + escape(text) + '</p>').join('')}</div><nav id="related-tools" class="tool-links" aria-label="Fler slumpverktyg">${links}</nav></section>`;
}

function schema(page) {
  const website = {'@type': 'WebSite', '@id': 'https://randomisera.se/#website', url: 'https://randomisera.se/', name: 'Randomisera.se', inLanguage: 'sv'};
  const webpage = {'@type': 'WebPage', '@id': page.canonical, url: page.canonical, name: page.title, description: page.description, inLanguage: 'sv', isPartOf: {'@id': website['@id']}};
  return JSON.stringify({'@context': 'https://schema.org', '@graph': page.file === 'index.html' ? [website, webpage] : [webpage]}).replaceAll('<', '\\u003c');
}

function render(root, templateFile, pages, content, flags) {
  const template = fs.readFileSync(path.join(root, templateFile), 'utf8');
  return new Map(pages.map(page => {
    const values = {...page, ...content[page.mode || page.decision], ...flags(page), useCases: useCases(page), schema: schema(page)};
    const html = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      if (!(key in values)) throw Error('Unknown tool template field: ' + key);
      return values[key];
    });
    return [page.file, html];
  }));
}

const renderListPages = root => render(root, 'templates/list-tool.html', listPages, listContent, page => ({choosePressed: page.mode === 'choose', groupsPressed: page.mode === 'groups', listPressed: page.mode === 'list'}));
const renderDecisionPages = root => render(root, 'templates/decision-tool.html', decisionPages, decisionContent, page => ({coinPressed: page.decision === 'coin', yesPressed: page.decision === 'yes', dicePressed: page.decision === 'dice', diceHidden: page.decision === 'dice' ? '' : ' hidden', diceDisabled: page.decision === 'dice' ? '' : ' disabled'}));
const renderPages = root => new Map([...renderListPages(root), ...renderDecisionPages(root)]);
const canonicalUrls = [...listPages, ...decisionPages, ...otherPages].map(page => page.canonical);
const renderSitemap = () => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + canonicalUrls.map(url => '  <url><loc>' + url + '</loc></url>').join('\n') + '\n</urlset>\n';

function generate(root = path.resolve(__dirname, '..')) {
  for (const [file, html] of [...renderPages(root), ['sitemap.xml', renderSitemap()]]) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) fs.writeFileSync(target, html);
  }
}

if (require.main === module) generate();
module.exports = {renderListPages, renderDecisionPages, renderPages, renderSitemap, canonicalUrls, generate, useCases};
