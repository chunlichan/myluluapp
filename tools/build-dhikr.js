#!/usr/bin/env node
/*
 * build-dhikr.js  —  regenerates the app's dhikr data from the master file.
 *
 * Reads data/dhikr.json (the single source of truth) and rewrites the
 * `const DHIKR = [ ... ];` block inside www/index.html to match it, exactly.
 *
 * WORKFLOW to add / edit / reorder a dhikr:
 *   1. Edit data/dhikr.json           (add an object, change text, reorder, ...)
 *   2. node tools/build-dhikr.js      (pushes it into the app)
 *   3. npx cap copy                   (when building the Android app)
 *
 * The same data/dhikr.json can also feed a website and a PDF generator, so all
 * three always tally.
 *
 *   node tools/build-dhikr.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const jsonPath = path.join(ROOT, 'data', 'dhikr.json');
const htmlPath = path.join(ROOT, 'www', 'index.html');

const DHIKR = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// ---- basic validation so a typo can't silently break the app --------------
const seen = new Set();
DHIKR.forEach((d, i) => {
  if (!d.key)  throw new Error(`entry #${i} is missing "key"`);
  if (!d.cat)  throw new Error(`"${d.key}" is missing "cat"`);
  if (!d.ar)   throw new Error(`"${d.key}" is missing "ar"`);
  if (seen.has(d.key)) throw new Error(`duplicate key "${d.key}"`);
  seen.add(d.key);
});

// ---- serialise back to the same JS style the file already uses -------------
const jsStr = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const HEAD  = ['key','cat','subcat','title','ar','tl','tr','count','targetOptions','defaultTarget','inlineTarget','ref'];
const TAIL  = ['arFull','tlFull','trFull','note'];   // rendered on their own lines

function emit(d) {
  // any field not in the known HEAD/TAIL lists (e.g. language variants tr_ms,
  // trFull_ms, note_id) is preserved so nothing in dhikr.json is silently
  // dropped. Classify by the field's BASE name (language suffix stripped) so
  // e.g. trFull_ur buckets with trFull (own line) and tr_ur buckets with tr
  // (inline) — matching on the raw key text missed every suffixed variant.
  const known = new Set([...HEAD, ...TAIL]);
  const baseField = k => k.replace(/_[a-z]{2,3}$/, '');
  const extraHead = Object.keys(d).filter(k => !known.has(k) && !TAIL.includes(baseField(k)));
  const extraTail = Object.keys(d).filter(k => !known.has(k) && TAIL.includes(baseField(k)));
  const head = HEAD.filter(f => d[f] !== undefined).concat(extraHead).map(f => {
    const v = d[f];
    // arrays of objects (e.g. `pages` for multi-page readings) → JSON literal (valid JS)
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') return `${f}:${JSON.stringify(v)}`;
    if (Array.isArray(v)) return `${f}:[${v.map(x => (typeof x === 'number' || typeof x === 'boolean') ? x : jsStr(x)).join(',')}]`;
    if (typeof v === 'number' || typeof v === 'boolean') return `${f}:${v}`;
    return `${f}:${jsStr(v)}`;
  }).join(', ');
  const tail = TAIL.filter(f => d[f] !== undefined).concat(extraTail);
  if (!tail.length) return `    { ${head} },`;
  const lines = tail.map((f, i) => {
    const isLast = i === tail.length - 1;
    return `      ${f}:${jsStr(d[f])}${isLast ? ' },' : ','}`;
  });
  return `    { ${head},\n` + lines.join('\n');
}

const body = DHIKR.map(emit).join('\n');
const literal = '[\n' + body + '\n  ]';

// ---- splice it into index.html (bracket-matched, marker-free) --------------
const html = fs.readFileSync(htmlPath, 'utf8');
const startTok = 'const DHIKR = [';
const startIdx = html.indexOf(startTok);
if (startIdx === -1) throw new Error('Could not find `const DHIKR = [` in index.html');
const arrOpen = startIdx + startTok.length - 1;
let depth = 0, end = -1;
for (let i = arrOpen; i < html.length; i++) {
  const c = html[i];
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const next = html.slice(0, arrOpen) + literal + html.slice(end);

// sanity: the inline <script> must still parse
const scripts = [...next.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) { try { new Function(s); } catch (e) { throw new Error('Generated JS is invalid: ' + e.message); } }

fs.writeFileSync(htmlPath, next);
console.log(`Rebuilt DHIKR in www/index.html from ${DHIKR.length} entries in data/dhikr.json`);
