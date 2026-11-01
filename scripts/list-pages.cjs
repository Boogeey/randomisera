'use strict';
const fs = require('node:fs');
const path = require('node:path');

const pages = [
  {file: 'index.html', base: './', mode: 'choose', title: 'Låt slumpen avgöra – namn, grupper och listor | Randomisera.se', description: 'Låt slumpen avgöra mellan namn, filmer, restauranger eller egna alternativ. Dra ett eller flera alternativ, med historik och utan upprepningar.', canonical: 'https://randomisera.se/'},
  {file: 'dela-in-i-grupper/index.html', base: '../', mode: 'groups', title: 'Dela in i slumpmässiga grupper | Randomisera.se', description: 'Dela in namn i slumpmässiga grupper eller lag. Välj antal grupper och få en jämn fördelning. Samma lista kan också användas för slumpval och blandning.', canonical: 'https://randomisera.se/dela-in-i-grupper/'},
  {file: 'slumpa-lista/index.html', base: '../', mode: 'list', title: 'Blanda en lista i slumpmässig ordning | Randomisera.se', description: 'Blanda en lista i slumpmässig ordning. Slumpa presentationsordning, namn eller egna alternativ. Hämta och spara listor direkt i webbläsaren.', canonical: 'https://randomisera.se/slumpa-lista/'}
];

function renderListPages(root) {
  const template = fs.readFileSync(path.join(root, 'templates/list-tool.html'), 'utf8');
  return new Map(pages.map(page => [page.file, template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in page)) throw Error('Unknown list template field: ' + key);
    return page[key];
  })]));
}

function generate(root = path.resolve(__dirname, '..')) {
  for (const [file, html] of renderListPages(root)) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) fs.writeFileSync(target, html);
  }
}

if (require.main === module) generate();
module.exports = {renderListPages, generate};
