import type {
  Assignment, CityData, HouseNumber, Parity, Place, Resolution, Rule, Street, Parish, ParishStreet,
} from './types';

export class DataError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Неисправни подаци:\n${problems.join('\n')}`);
  }
}

function inRange(rule: Rule, n: number): boolean {
  if (rule.from !== null && n < rule.from) return false;
  if (rule.to !== null && n > rule.to) return false;
  return parityMatches(rule.parity, n);
}

function parityMatches(parity: Parity, n: number): boolean {
  return parity === 'all' || (parity === 'odd') === (n % 2 === 1);
}

const sortKey = (r: Rule): [number, number] => [r.from ?? 0, r.to ?? Infinity];

function bySegment(a: Rule, b: Rule): number {
  const [af, at] = sortKey(a);
  const [bf, bt] = sortKey(b);
  return af - bf || at - bt;
}

/** A rule with no bounds and no parity covers every number of the street. */
export function coversAllNumbers(rule: Pick<Rule, 'from' | 'to' | 'parity'>): boolean {
  return rule.from === null && rule.to === null && rule.parity === 'all';
}

export function formatRange(rule: Pick<Rule, 'from' | 'to' | 'parity'>): string {
  const { from, to, parity } = rule;
  const suffix = parity === 'odd' ? ' (непарни)' : parity === 'even' ? ' (парни)' : '';
  if (from === null && to === null) {
    return (parity === 'odd' ? 'сви непарни бројеви' : parity === 'even' ? 'сви парни бројеви' : 'сви бројеви');
  }
  return `бр. ${from ?? 1}–${to ?? 'крај'}${suffix}`;
}

/**
 * Decision order (plan §3):
 * 1. all matching rules for the number; 2. inherited from the parish the street lies in;
 * 3. unassigned. Construction validates references and throws DataError listing every problem.
 */
export function createResolver(data: CityData) {
  const problems: string[] = [];
  const parishes = new Map<string, Parish>(data.parishes.map((t) => [t.id, t]));
  const streets = new Map<string, Street>(data.streets.map((s) => [s.id, s]));
  const rulesByStreet = new Map<string, Rule[]>();
  const internal = new Map<string, string>();

  for (const r of data.rules) {
    if (!streets.has(r.streetId)) problems.push(`правило: непозната улица "${r.streetId}"`);
    if (!parishes.has(r.parishId)) problems.push(`правило за "${r.streetId}": непозната парохија "${r.parishId}"`);
    if (r.from !== null && r.to !== null && r.from > r.to) problems.push(`правило за "${r.streetId}": од ${r.from} је веће од до ${r.to}`);
    const list = rulesByStreet.get(r.streetId) ?? [];
    list.push(r);
    rulesByStreet.set(r.streetId, list);
  }
  for (const i of data.internal) {
    if (!streets.has(i.streetId)) problems.push(`унутрашња улица: непозната улица "${i.streetId}"`);
    if (!parishes.has(i.parishId)) problems.push(`унутрашња улица "${i.streetId}": непозната парохија "${i.parishId}"`);
    if (internal.has(i.streetId)) problems.push(`унутрашња улица "${i.streetId}" је у више парохија`);
    internal.set(i.streetId, i.parishId);
  }
  const places = data.places ?? [];
  const placeIds = new Set<string>();
  const churches = new Map<string, Place>();
  for (const p of places) {
    if (placeIds.has(p.id)) problems.push(`тачка "${p.id}" се понавља`);
    placeIds.add(p.id);
    if (!parishes.has(p.parishId)) problems.push(`тачка "${p.id}": непозната парохија "${p.parishId}"`);
    if (p.kind === 'church') {
      if (churches.has(p.parishId)) problems.push(`парохија "${p.parishId}" има више од једног парохијског храма`);
      churches.set(p.parishId, p);
    }
  }
  if (problems.length) throw new DataError(problems);

  const assignmentFor = (parish: Parish, rule?: Rule): Assignment => ({
    parish,
    people: rule?.assignee ? { primary: rule.assignee } : parish.defaults,
    rule,
  });
  const fromRule = (r: Rule) => assignmentFor(parishes.get(r.parishId)!, r);

  return {
    streets: data.streets,
    places,
    parishes,

    /** The meeting place of a parish, if the data has one. */
    churchOf(parishId: string): Place | undefined {
      return churches.get(parishId);
    },

    /**
     * Streets of a parish for its printed card, by name: streets it owns by rules (with the ranges)
     * and streets lying inside it. `rest` = it also owns the numbers no rule covers (a street inside it that has rules).
     */
    streetsOf(parishId: string): ParishStreet[] {
      const found = new Map<string, ParishStreet>();
      for (const [streetId, rules] of rulesByStreet) {
        const own = rules.filter((r) => r.parishId === parishId).sort(bySegment);
        if (own.length) found.set(streetId, { street: streets.get(streetId)!, segments: own, rest: internal.get(streetId) === parishId });
      }
      for (const [streetId, owner] of internal) {
        if (owner === parishId && !found.has(streetId)) {
          found.set(streetId, { street: streets.get(streetId)!, segments: [], rest: false });
        }
      }
      return [...found.values()].sort((a, b) => a.street.name.localeCompare(b.street.name, 'sr'));
    },

    resolve(streetId: string, house: HouseNumber | null): Resolution {
      const street = streets.get(streetId);
      if (!street) throw new Error(`Непозната улица: ${streetId}`);
      const rules = rulesByStreet.get(streetId) ?? [];

      if (house && rules.length) {
        const matches = rules.filter((r) => inRange(r, house.n)).sort(bySegment);
        if (matches.length) {
          const assignments = matches.map(fromRule);
          const distinct = new Set(
            assignments.map((a) => `${a.parish.id}|${a.people.primary}|${a.people.deputy ?? ''}`),
          );
          return { kind: 'rules', street, house, assignments, border: distinct.size > 1 };
        }
      }

      if (!house && rules.length) {
        return { kind: 'linear', street, segments: [...rules].sort(bySegment).map(fromRule) };
      }

      const parishId = internal.get(streetId);
      if (parishId) {
        return { kind: 'inherited', street, house, assignment: assignmentFor(parishes.get(parishId)!) };
      }
      return { kind: 'unassigned', street, house };
    },
  };
}

export type Resolver = ReturnType<typeof createResolver>;
