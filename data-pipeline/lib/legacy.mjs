// Data published before the parish vocabulary (#1) used "territories", `territoryId` and the place kind "capital".
// restore-previous.mjs upgrades such files, so a city whose Sheet data is broken can still keep its previous version.

const renameKey = (obj, from, to) => {
  if (!obj || !(from in obj)) return obj;
  const { [from]: value, ...rest } = obj;
  return { ...rest, [to]: value };
};

/** CityData as published before #1 -> current CityData. Current data is returned unchanged. */
export function upgradeLegacyCityData(data) {
  if (!data || typeof data !== 'object' || !('territories' in data)) return data;
  const upgraded = renameKey(data, 'territories', 'parishes');
  for (const list of ['rules', 'internal', 'places']) {
    if (Array.isArray(upgraded[list])) upgraded[list] = upgraded[list].map((item) => renameKey(item, 'territoryId', 'parishId'));
  }
  if (Array.isArray(upgraded.places)) {
    upgraded.places = upgraded.places.map((p) => (p.kind === 'capital' ? { ...p, kind: 'church' } : p));
  }
  return upgraded;
}
