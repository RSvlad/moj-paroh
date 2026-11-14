import { describe, expect, it } from 'vitest';
import { parseHouseNumber } from '../resolver';
import type { Assignment, Place, Resolution, Rule, Street } from '../resolver';
import { resultText } from './shareText';

const street = { id: 's1', name: 'Футошка' } as Street;
const house = parseHouseNumber('12')!;
const rule = (from: number | null, to: number | null, parity: Rule['parity'] = 'all') => ({ from, to, parity }) as Rule;
const assignment = (id: string, name: string, primary: string, r?: Rule, deputy?: string): Assignment => ({
  territory: { id, name } as Assignment['territory'],
  people: { primary, deputy },
  rule: r,
});
const capital: Place = { id: 'p1', name: 'Прва Саборна', kind: 'capital', territoryId: '1', address: 'Футошка 1, Нови Сад' };
const title = 'Футошка 12 · Нови Сад';

describe('resultText', () => {
  it('rules: omits the range when the number is entered', () => {
    const result: Resolution = {
      kind: 'rules', street, house, border: false,
      assignments: [assignment('1', 'Прва Саборна', 'Петар П.', rule(null, null), 'Мира М.')],
    };
    expect(resultText(result, title, [capital])).toBe(
      [title, 'Парохија 1 „Прва Саборна“: Петар П. (заменик: Мира М.)', '★ Парохијски храм: Прва Саборна, Футошка 1, Нови Сад'].join('\n'),
    );
  });

  it('rules: a border number keeps both ranges, a shared territory is named once', () => {
    const result: Resolution = {
      kind: 'rules', street, house, border: true,
      assignments: [assignment('1', 'Прва Саборна', 'Петар П.', rule(1, 12)), assignment('1', 'Прва Саборна', 'Мира М.', rule(12, null))],
    };
    expect(resultText(result, title, [])).toBe(
      [
        title,
        'Парохија 1 „Прва Саборна“:',
        '  Петар П. бр. 1–12',
        '  Мира М. бр. 12–крај',
        '⚠ Број 12 је граничан: наведена су оба задужења.',
      ].join('\n'),
    );
  });

  it('rules: border across territories names each territory with its range', () => {
    const result: Resolution = {
      kind: 'rules', street, house, border: true,
      assignments: [assignment('1', 'Прва Саборна', 'Петар П.', rule(1, 12)), assignment('15', 'Центар', 'Немања Н.', rule(12, null))],
    };
    const lines = resultText(result, title, []).split('\n');
    expect(lines.slice(1, 3)).toEqual(['Парохија 1 „Прва Саборна“: Петар П. бр. 1–12', 'Парохија 15 „Центар“: Немања Н. бр. 12–крај']);
  });

  it('linear: keeps the ranges, which tell the segments apart', () => {
    const result: Resolution = {
      kind: 'linear', street,
      segments: [assignment('1', 'Прва Саборна', 'Петар П.', rule(1, 20, 'odd')), assignment('15', 'Центар', 'Немања Н.', rule(2, 20, 'even'))],
    };
    expect(resultText(result, 'Футошка · Нови Сад', [])).toBe(
      [
        'Футошка · Нови Сад',
        'Улица је подељена по бројевима:',
        'Парохија 1 „Прва Саборна“: Петар П. бр. 1–20 (непарни)',
        'Парохија 15 „Центар“: Немања Н. бр. 2–20 (парни)',
      ].join('\n'),
    );
  });

  it('inherited: no range', () => {
    const result: Resolution = { kind: 'inherited', street, house, assignment: assignment('1', 'Прва Саборна', 'Петар П.') };
    expect(resultText(result, title, [])).toBe([title, 'Парохија 1 „Прва Саборна“: Петар П.'].join('\n'));
  });

  it('unassigned', () => {
    const result: Resolution = { kind: 'unassigned', street, house: null };
    expect(resultText(result, 'Футошка · Нови Сад', [])).toBe('Футошка · Нови Сад\nУлица није додељена.');
  });

  it('several capitals name their territory', () => {
    const result: Resolution = { kind: 'inherited', street, house, assignment: assignment('1', 'Прва Саборна', 'Петар П.') };
    const other: Place = { ...capital, id: 'p2', territoryId: '15', name: 'Центар' };
    const text = resultText(result, title, [capital, other]);
    expect(text).toContain('★ Парохијски храм (парохија 1): Прва Саборна');
    expect(text).toContain('★ Парохијски храм (парохија 15): Центар');
  });
});
