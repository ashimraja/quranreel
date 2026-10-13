// Quran.com recitation ids. Each supplies both the audio and the word timings,
// so the on-screen highlight matches the voice exactly. Pick one in Settings.
export const RECITERS = [
  {id: 7, name: 'Mishary Alafasy'},
  {id: 3, name: 'Abdur-Rahman As-Sudais'},
  {id: 2, name: 'AbdulBaset AbdulSamad'},
  {id: 6, name: 'Mahmoud Al-Husary'},
  {id: 9, name: 'Mohamed Al-Minshawi'},
];
export const DEFAULT_RECITER_ID = 7;
// Quran.com translation id. 20 = Saheeh International.
export const TRANSLATION_ID = 20;
export const QURAN_COM_API = 'https://api.quran.com/api/v4';
export const AUDIO_HOST = 'https://verses.quran.com/';

// Instagram Graph API (Instagram Content Publishing).
export const GRAPH_API = 'https://graph.facebook.com/v21.0';
export const RUPLOAD_API = 'https://rupload.facebook.com/ig-api-upload/v21.0';

export const TOTAL_AYAHS = 6236;

export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const PADDING_SECONDS = 0.5;

// A video holds whole verses of one surah, up to this length. Longer surahs
// continue in the next part. (A single verse longer than this gets its own video.)
export const MAX_VIDEO_SECONDS = 120;

// Word-highlight animation.
export const FADE_SECONDS = 0.25; // crossfade between highlight steps
export const MAX_STEPS = 80; // max distinct frames per video
export const MIN_STEP_SECONDS = 0.6; // never switch faster than this

// Hashtags appended to every caption.
export const HASHTAGS = [
  '#Quran',
  '#QuranVerses',
  '#AyahByAyah',
  '#QuranRecitation',
  '#Islam',
  '#Muslim',
  '#Reels',
];
