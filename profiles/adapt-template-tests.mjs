// Used only by .github/workflows/sync-upstream.yml, after a merge from the template.
// The template's tests spell out its own words ("Територија 14 „Либерти“"); this app's words are in
// profiles/paroh/profile.json and stay as they are. The script rewrites those words in the given test files
// (the ones the merge changed) so that they expect this app's vocabulary. It is idempotent.
// Usage: node profiles/adapt-template-tests.mjs <file>...
import { readFileSync, writeFileSync } from 'node:fs';

// Longest first: a longer phrase must win over the shorter one it contains.
const WORDS = [
  ['Најближа престоница', 'Најближи парохијски храм'],
  ['најближа престоница', 'најближи парохијски храм'],
  ['Престоница', 'Парохијски храм'],
  ['престоница', 'парохијски храм'],
  ['престонице', 'парохијског храма'],
  ['престоницу', 'парохијски храм'],
  ['Територија', 'Парохија'],
  ['територија', 'парохија'],
  ['Територије', 'Парохије'],
  ['територије', 'парохије'],
  ['Територију', 'Парохију'],
  ['територију', 'парохију'],
  ['територији', 'парохији'],
];

let changed = 0;
for (const file of process.argv.slice(2)) {
  const before = readFileSync(file, 'utf8');
  let after = before;
  for (const [from, to] of WORDS) after = after.split(from).join(to);
  if (after !== before) {
    writeFileSync(file, after);
    console.log(`adapted: ${file}`);
    changed++;
  }
}
console.log(changed ? `${changed} file(s) adapted` : 'nothing to adapt');
