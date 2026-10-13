import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import {DEFAULT_RECITER_ID, TOTAL_AYAHS} from './config';

const KEY = 'lastCompletedAyah';

export async function getLastCompleted(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), TOTAL_AYAHS) : 0;
}

export async function setLastCompleted(n: number) {
  await AsyncStorage.setItem(KEY, String(n));
}

export async function resetProgress() {
  await AsyncStorage.setItem(KEY, '0');
}

// Created reels live in app storage until the user deletes them here.
export type Reel = {
  id: number; // global ayah number
  title: string;
  caption: string;
  path: string;
  createdAt: number;
  postedAt?: number; // set once published to Instagram
  thumbPath?: string;
  thumbMs?: number; // moment in the video used as the Instagram cover
};

const REELS_KEY = 'reels';

export async function getReels(): Promise<Reel[]> {
  const raw = await AsyncStorage.getItem(REELS_KEY);
  const all: Reel[] = raw ? JSON.parse(raw) : [];
  // Drop entries whose file no longer exists.
  const alive: Reel[] = [];
  for (const r of all) {
    if (await RNFS.exists(r.path)) {
      alive.push(r);
    }
  }
  return alive.sort((a, b) => b.createdAt - a.createdAt);
}

export async function addReel(reel: Reel) {
  const others = (await getReels()).filter(r => r.id !== reel.id);
  await AsyncStorage.setItem(REELS_KEY, JSON.stringify([reel, ...others]));
}

export async function deleteReel(reel: Reel) {
  await RNFS.unlink(reel.path).catch(() => {});
  if (reel.thumbPath) {
    await RNFS.unlink(reel.thumbPath).catch(() => {});
  }
  const rest = (await getReels()).filter(r => r.id !== reel.id);
  await AsyncStorage.setItem(REELS_KEY, JSON.stringify(rest));
}

export async function markPosted(id: number) {
  const all = await getReels();
  await AsyncStorage.setItem(
    REELS_KEY,
    JSON.stringify(all.map(r => (r.id === id ? {...r, postedAt: Date.now()} : r))),
  );
}

// App settings, kept on this device only.
export type Settings = {
  pageName: string;
  reciterId: number;
  igUserId: string;
  igToken: string;
};
const SETTINGS_KEY = 'settings';

export async function getSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return {
    pageName: '',
    reciterId: DEFAULT_RECITER_ID,
    igUserId: '',
    igToken: '',
    ...(raw ? JSON.parse(raw) : {}),
  };
}

export async function setSettings(s: Settings) {
  await AsyncStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      ...s,
      pageName: s.pageName.trim(),
      igUserId: s.igUserId.trim(),
      igToken: s.igToken.trim(),
    }),
  );
}
