#!/usr/bin/env node
/*
 * extract-dhikr.js  —  ONE-TIME (re-runnable) importer.
 *
 * Reads the DHIKR array that currently lives inside www/index.html and writes it
 * out to data/dhikr.json (the single source of truth). Run this once to create
 * the master file. After that you edit data/dhikr.json and run build-dhikr.js.
 *
 *   node tools/extract-dhikr.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'www', 'index.html'), 'utf8');

// --- locate the `const DHIKR = [ ... ];` literal and grab it with bracket matching
const startTok = 'const DHIKR = [';
const startIdx = html.indexOf(startTok);
if (startIdx === -1) { console.error('Could not find `const DHIKR = [` in index.html'); process.exit(1); }
const arrOpen = startIdx + startTok.length - 1;        // index of the '['
let depth = 0, end = -1;
for (let i = arrOpen; i < html.length; i++) {
  const c = html[i];
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const arrLiteral = html.slice(arrOpen, end);           // "[ ... ]"

// --- the array literal uses joinAyahs([...]) for numbered surahs. Provide the same
//     helpers so eval resolves them to the final Arabic strings (with ۝ ayah marks).
const EASTERN = '٠١٢٣٤٥٦٧٨٩';
const toEastern = n => String(n).split('').map(c => EASTERN[+c] ?? c).join('');
const ayahEndMark = n => '۝' + toEastern(n);
const joinAyahs = ayahs => ayahs.map((a, i) => a + ' ' + ayahEndMark(i + 1)).join(' ');

// eslint-disable-next-line no-eval
const DHIKR = eval('(' + arrLiteral + ')');

// keep a stable, readable field order in the JSON
const FIELD_ORDER = ['key','cat','subcat','title','ar','tl','tr','count',
  'targetOptions','defaultTarget','inlineTarget','ref','arFull','tlFull','trFull','note'];
const ordered = DHIKR.map(d => {
  const o = {};
  for (const f of FIELD_ORDER) if (d[f] !== undefined) o[f] = d[f];
  // carry any unexpected extra fields too, so nothing is silently dropped
  for (const k of Object.keys(d)) if (!(k in o)) o[k] = d[k];
  return o;
});

const out = path.join(ROOT, 'data', 'dhikr.json');
fs.writeFileSync(out, JSON.stringify(ordered, null, 2) + '\n');
console.log('Wrote ' + ordered.length + ' dhikr → data/dhikr.json');
