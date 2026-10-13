import NetInfo from '@react-native-community/netinfo';
import {
  AUDIO_HOST,
  QURAN_COM_API,
  TRANSLATION_ID,
} from './config';

export type Verse = {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  arabic: string;
  words: string[];
  // Per-word start/end in milliseconds, relative to the start of this verse's audio.
  timings: {start: number; end: number}[];
  translation: string;
  audioUrl: string;
  // Rough length used only for splitting a surah into videos.
  estimatedMs: number;
};

export type Chapter = {number: number; name: string; versesCount: number};

export class AppError extends Error {}

const API_ERROR = 'Could not load the verses. Please try again.';
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

export async function ensureOnline() {
  const state = await NetInfo.fetch();
  if (state.isConnected === false || state.isInternetReachable === false) {
    throw new AppError('No internet connection.');
  }
}

async function getJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(String(res.status));
  }
  return res.json();
}

let chapters: Chapter[] | null = null;
export async function getChapters(): Promise<Chapter[]> {
  if (chapters) {
    return chapters;
  }
  await ensureOnline();
  try {
    const j = await getJson(`${QURAN_COM_API}/chapters`);
    chapters = j.chapters.map((c: any) => ({
      number: c.id,
      name: c.name_simple,
      versesCount: c.verses_count,
    }));
    return chapters!;
  } catch {
    throw new AppError(API_ERROR);
  }
}

const surahCache = new Map<string, Verse[]>();

// All verses of a surah with word timings, translation and audio url.
export async function getSurah(surah: number, reciterId: number): Promise<Verse[]> {
  const cacheKey = `${reciterId}:${surah}`;
  const hit = surahCache.get(cacheKey);
  if (hit) {
    return hit;
  }
  const chap = (await getChapters())[surah - 1];
  try {
    const rec = await getJson(
      `${QURAN_COM_API}/recitations/${reciterId}/by_chapter/${surah}?fields=segments&per_page=300`,
    );
    const audio = new Map<string, any>(
      rec.audio_files.map((a: any) => [a.verse_key, a]),
    );

    const verses: Verse[] = [];
    for (let page = 1; page; ) {
      const j = await getJson(
        `${QURAN_COM_API}/verses/by_chapter/${surah}?words=true&word_fields=text_uthmani` +
          `&translations=${TRANSLATION_ID}&per_page=50&page=${page}`,
      );
      for (const v of j.verses) {
        // 'word' entries match the audio segments; 'end' is the verse-number marker.
        const words: string[] = v.words
          .filter((w: any) => w.char_type_name === 'word')
          .map((w: any) => w.text_uthmani);
        const a = audio.get(v.verse_key);
        const segs: number[][] = a?.segments ?? [];
        if (!a?.url || !segs.length || !words.length) {
          throw new Error('missing data');
        }

        // Segments are [wordIndex, wordPosition, startMs, endMs].
        let timings = segs.map(s => ({start: s[2], end: s[3]}));
        const endMs = timings[timings.length - 1].end;
        if (timings.length !== words.length) {
          // Rare count mismatch: spread words over the spoken span by letter count.
          const from = timings[0].start;
          const weights = words.map(w => Math.max(1, w.replace(DIACRITICS, '').length));
          const total = weights.reduce((x, y) => x + y, 0);
          let acc = from;
          timings = weights.map(w => {
            const start = acc;
            acc += ((endMs - from) * w) / total;
            return {start, end: acc};
          });
        }

        const url: string = a.url;
        verses.push({
          surahNumber: surah,
          surahName: chap.name,
          ayahNumber: v.verse_number,
          arabic: words.join(' '),
          words,
          timings,
          translation: String(v.translations?.[0]?.text ?? '')
            .replace(/<sup[^>]*>.*?<\/sup>/g, '')
            .replace(/<[^>]+>/g, '')
            .trim(),
          audioUrl: url.startsWith('//')
            ? `https:${url}`
            : url.startsWith('http')
            ? url
            : AUDIO_HOST + url,
          estimatedMs: endMs + 400,
        });
      }
      page = j.pagination?.next_page ?? 0;
    }
    surahCache.set(cacheKey, verses);
    return verses;
  } catch {
    throw new AppError(API_ERROR);
  }
}
