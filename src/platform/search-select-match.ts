const ENGLISH_KEYS = "`qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const RUSSIAN_KEYS = 'ёйцукенгшщзхъфывапролджэячсмитьбю';

const SHIFTED_KEYS: Record<string, string> = {
  '~': '`',
  '{': '[',
  '}': ']',
  ':': ';',
  '"': "'",
  '<': ',',
  '>': '.',
};

function changeLayout(value: string, from: string, to: string): string {
  return Array.from(value.normalize('NFKC').toLowerCase(), (letter) => {
    const key =
      from === ENGLISH_KEYS ? (SHIFTED_KEYS[letter] ?? letter) : letter;
    const index = from.indexOf(key);
    return index < 0 ? letter : to.charAt(index);
  }).join('');
}

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replaceAll('ё', 'е').trim();
}

function matchRank(label: string, query: string): number {
  if (label === query) return 0;
  if (label.startsWith(query)) return 1;
  if (label.includes(query)) return 2;
  return query.split(/\s+/).every((word) => label.includes(word))
    ? 3
    : Infinity;
}

export function searchSelectOptions<T extends { label: string }>(
  options: readonly T[],
  query: string,
): T[] {
  if (!query.trim()) return [...options];
  const literal = normalize(query);
  const alternatives = [
    changeLayout(query, RUSSIAN_KEYS, ENGLISH_KEYS),
    changeLayout(query, ENGLISH_KEYS, RUSSIAN_KEYS),
  ]
    .map(normalize)
    .filter((value) => value !== literal);
  return options
    .map((option, index) => {
      const label = normalize(option.label);
      const directRank = matchRank(label, literal);
      const layoutRank =
        Math.min(...alternatives.map((value) => matchRank(label, value))) + 4;
      return { option, index, rank: Math.min(directRank, layoutRank) };
    })
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.option);
}
