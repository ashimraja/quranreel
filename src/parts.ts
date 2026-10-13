import {AppError, getChapters, getSurah, Verse} from './api';
import {MAX_VIDEO_SECONDS, PADDING_SECONDS} from './config';

// One video = consecutive whole verses of a single surah.
export type Part = {
  surah: number;
  surahName: string;
  index: number; // 0-based part within the surah
  count: number; // parts in the surah
  reciterId: number;
  verses: Verse[];
  startGlobal: number;
  endGlobal: number;
};

async function toGlobal(surah: number, ayah: number) {
  const ch = await getChapters();
  let n = 0;
  for (let i = 0; i < surah - 1; i++) {
    n += ch[i].versesCount;
  }
  return n + ayah;
}

async function fromGlobal(g: number) {
  const ch = await getChapters();
  let left = g;
  for (const c of ch) {
    if (left <= c.versesCount) {
      return {surah: c.number, ayah: left};
    }
    left -= c.versesCount;
  }
  throw new AppError('Verse number out of range.');
}

// Greedy split so every part fits in MAX_VIDEO_SECONDS, always ending on a verse.
function splitSurah(verses: Verse[]) {
  const limit = (MAX_VIDEO_SECONDS - 2 * PADDING_SECONDS) * 1000;
  const ranges: {from: number; to: number}[] = [];
  let from = 0;
  let sum = 0;
  verses.forEach((v, i) => {
    if (i > from && sum + v.estimatedMs > limit) {
      ranges.push({from, to: i - 1});
      from = i;
      sum = 0;
    }
    sum += v.estimatedMs;
  });
  ranges.push({from, to: verses.length - 1});
  return ranges;
}

export async function loadPart(globalStart: number, reciterId: number): Promise<Part> {
  const {surah, ayah} = await fromGlobal(globalStart);
  const verses = await getSurah(surah, reciterId);
  const ranges = splitSurah(verses);
  const index = Math.max(
    0,
    ranges.findIndex(r => ayah - 1 >= r.from && ayah - 1 <= r.to),
  );
  const r = ranges[index];
  const first = await toGlobal(surah, r.from + 1);
  return {
    surah,
    surahName: verses[0].surahName,
    index,
    count: ranges.length,
    reciterId,
    verses: verses.slice(r.from, r.to + 1),
    startGlobal: first,
    endGlobal: first + (r.to - r.from),
  };
}

// Global start of the previous (-1) or next (1) video, or null at the ends.
export async function neighbour(part: Part, dir: 1 | -1): Promise<number | null> {
  if (dir === 1) {
    return part.endGlobal >= 6236 ? null : part.endGlobal + 1;
  }
  if (part.startGlobal <= 1) {
    return null;
  }
  return (await loadPart(part.startGlobal - 1, part.reciterId)).startGlobal;
}

export function partLabel(p: Part) {
  const a = p.verses[0].ayahNumber;
  const b = p.verses[p.verses.length - 1].ayahNumber;
  const range = a === b ? `${a}` : `${a}-${b}`;
  const part = p.count > 1 ? ` (part ${p.index + 1}/${p.count})` : '';
  return `Surah ${p.surahName} ${p.surah}:${range}${part}`;
}
