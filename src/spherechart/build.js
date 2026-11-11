// Assembles site/spherechart/index.html from the pieces in this folder.
// Run from the repository root:  node src/spherechart/build.js
const fs = require('fs'), path = require('path');
const here = __dirname, out = path.join(here, '..', '..', 'site', 'spherechart', 'index.html');
let html = fs.readFileSync(path.join(here, 'index.template.html'), 'utf8');
for (const [key, file] of [['DATA', 'data.js'], ['ASTRO', 'astro.js'], ['APP', 'app.js']])
  html = html.replace('/*__' + key + '__*/', () => fs.readFileSync(path.join(here, file), 'utf8'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out, html.length, 'bytes');
