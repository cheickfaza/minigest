/* Assemble index.html autonome : intègre React 18, ReactDOM et htm en dur
 * dans la coquille, avec le CSS et le code applicatif MiniGest. */
const fs = require('fs');
const path = require('path');

const B = __dirname;
const OUT_DIR = path.join(B, '..');
const OUT = path.join(OUT_DIR, 'index.html');

function read(f) { return fs.readFileSync(path.join(B, f), 'utf8'); }

const react = read('node_modules/react/umd/react.production.min.js');
const reactDom = read('node_modules/react-dom/umd/react-dom.production.min.js');
const htm = read('node_modules/htm/dist/htm.umd.js');
const css = read('style.css');
const app = read('app.js');
let page = read('page.html');

/* Sécurité : aucun "</script" ne doit figurer dans le code inséré. */
const pieces = { react, 'react-dom': reactDom, htm, css, app };
for (const [name, content] of Object.entries(pieces)) {
  if (/<\/script/i.test(content)) {
    throw new Error('Séquence </script trouvée dans ' + name + ' — insérer un échappement.');
  }
}

/* Remplacement par fonctions : évite les pièges des motifs $ dans replace(). */
page = page
  .replace('/*__CSS__*/', () => css)
  .replace('/*__REACT__*/', () => react)
  .replace('/*__REACTDOM__*/', () => reactDom)
  .replace('/*__HTM__*/', () => htm)
  .replace('/*__APP__*/', () => app);

for (const token of ['/*__CSS__*/', '/*__REACT__*/', '/*__REACTDOM__*/', '/*__HTM__*/', '/*__APP__*/']) {
  if (page.includes(token)) throw new Error('Jetons non remplacés : ' + token);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, page);
console.log('OK :', OUT, '→', (fs.statSync(OUT).size / 1024).toFixed(1) + ' Ko');
