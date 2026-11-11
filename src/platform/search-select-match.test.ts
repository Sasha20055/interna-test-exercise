import { describe, expect, it } from 'vitest';
import { searchSelectOptions } from './search-select-match';

const labels = (values: string[], query: string) =>
  searchSelectOptions(
    values.map((label) => ({ label })),
    query,
  ).map((option) => option.label);

describe('search with Russian and English keyboard layouts', () => {
  it('finds English names typed using the Russian layout', () => {
    expect(labels(['SatCom Global', 'Other'], 'Ыфесщь')).toEqual([
      'SatCom Global',
    ]);
  });
  it('finds Russian names typed using the English layout', () => {
    expect(labels(['Ежемесячный', 'Другой'], 't;tv')).toEqual(['Ежемесячный']);
    expect(labels(['Ежемесячный'], 'T:TV')).toEqual(['Ежемесячный']);
  });
  it('places literal matches before converted matches, then exact and prefix matches first', () => {
    expect(
      labels(['Привет', 'a ghbdtn b', 'ghbdtn company', 'ghbdtn'], 'ghbdtn'),
    ).toEqual(['ghbdtn', 'ghbdtn company', 'a ghbdtn b', 'Привет']);
  });
  it('supports mixed scripts, case, whitespace, reordered words and ё', () => {
    expect(labels(['SatCom Global'], '  SATСOM  ')).toEqual(['SatCom Global']);
    expect(labels(['SatCom Global'], 'global satcom')).toEqual([
      'SatCom Global',
    ]);
    expect(labels(['Ёлка'], 'елка')).toEqual(['Ёлка']);
  });
  it('keeps numbers, punctuation, stable ordering and empty queries', () => {
    expect(labels(['Other', 'USD 840', 'USD 840 second'], '840')).toEqual([
      'USD 840',
      'USD 840 second',
    ]);
    expect(labels(['USD', 'EUR'], '  ')).toEqual(['USD', 'EUR']);
    expect(labels(['EUR'], 'not-found')).toEqual([]);
  });
});
