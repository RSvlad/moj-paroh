// Input of data-pipeline/parishes.py: the Sheet's "Обим" tab plus the churches' coordinates.
// Pure (apart from the writer), so it can be checked without network access.
import { mkdirSync, writeFileSync } from 'node:fs';
import { PipelineError, readTable } from './build-city.mjs';

const WORK_DIR = 'data-pipeline/work';

/**
 * -> { input, geocodedChurches }. `input` is the parishes-input.json payload of parishes.py:
 * every parish with its church's coordinates (when geocoded) and one scope row per "Обим" row.
 * Throws PipelineError for rows that point at an unknown parish.
 */
export function buildParishesInput(data, scopeRaw) {
  const problems = [];
  const rows = readTable('scope', 'Обим', scopeRaw, problems);
  const ids = new Set(data.parishes.map((t) => t.id));
  const scope = [];
  for (const { row, values: v } of rows) {
    if (!v.parish || !v.street) {
      problems.push(`Обим, ред ${row}: попуните парохију и улицу`);
    } else if (!ids.has(v.parish)) {
      problems.push(`Обим, ред ${row}: парохија „${v.parish}“ не постоји у листу „Парохије“`);
    } else {
      scope.push({ parish: v.parish, street: v.street, settlement: v.settlement, from: v.from, to: v.to });
    }
  }
  if (problems.length) throw new PipelineError(problems);

  const churches = new Map(
    data.places
      .filter((p) => p.kind === 'church' && Number.isFinite(p.lat) && Number.isFinite(p.lng))
      .map((p) => [p.parishId, { lat: p.lat, lng: p.lng }]),
  );
  const parishes = data.parishes.map((t) => (churches.has(t.id) ? { id: t.id, church: churches.get(t.id) } : { id: t.id }));
  return { input: { parishes, scope }, geocodedChurches: churches.size };
}

/**
 * Input for drawing from the streets alone (no churches, no scope tab): every parish plus, for each street
 * that has rules, the parishes those rules point to. parishes.py treats a street whose rules all point to
 * one parish as that parish's, and a street split between parishes as a border.
 */
export function buildRulesInput(data) {
  const owners = new Map();
  for (const r of data.rules) {
    if (!owners.has(r.streetId)) owners.set(r.streetId, new Set());
    owners.get(r.streetId).add(r.parishId);
  }
  const rules = data.streets
    .filter((s) => owners.has(s.id))
    .map((s) => ({ street: s.name, settlement: s.settlement ?? '', parishes: [...owners.get(s.id)].sort() }));
  return { parishes: data.parishes.map((t) => ({ id: t.id })), scope: [], rules };
}

/** data-pipeline/work/<city>/parishes-input.json (git-ignored: it comes from the private Sheet). */
export function writeParishesInput(city, input, dir = WORK_DIR) {
  const out = `${dir}/${city}/parishes-input.json`;
  mkdirSync(`${dir}/${city}`, { recursive: true });
  writeFileSync(out, JSON.stringify(input, null, 2) + '\n');
  return out;
}
