// Transition: until the first deploy of the template-based code, the live site publishes data in the vocabulary
// of the former fork ("parishes", `parishId`, place kind "church", borders in <city>.parishes.geojson), and
// before that in the oldest one ("territories", already the current shape). restore-previous.mjs uses this to
// keep a city whose Sheet data is broken at its previous version.
//
// DELETE this file after the first successful deploy of the template-based code: the live data is then current.

const renameKey = (obj, from, to) => {
  if (!obj || !(from in obj)) return obj;
  const { [from]: value, ...rest } = obj;
  return { ...rest, [to]: value };
};

/** CityData as the former fork published it -> current CityData. Current data is returned unchanged. */
export function upgradeCityData(data) {
  if (!data || typeof data !== 'object' || !('parishes' in data)) return data;
  const upgraded = renameKey(data, 'parishes', 'territories');
  for (const list of ['rules', 'internal', 'places']) {
    if (Array.isArray(upgraded[list])) upgraded[list] = upgraded[list].map((item) => renameKey(item, 'parishId', 'territoryId'));
  }
  if (Array.isArray(upgraded.places)) {
    upgraded.places = upgraded.places.map((p) => (p.kind === 'church' ? { ...p, kind: 'capital' } : p));
  }
  return upgraded;
}

/** Names under which the borders of a city were published before. */
export const previousGeojsonNames = (id) => [`${id}.parishes.geojson`];
