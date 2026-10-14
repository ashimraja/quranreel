import {PermissionsAndroid, Platform, View} from 'react-native';
import RNFS from 'react-native-fs';
import {captureRef} from 'react-native-view-shot';
import {CameraRoll} from '@react-native-camera-roll/camera-roll';
import {FFmpegKit, FFprobeKit, ReturnCode} from '@wokcito/ffmpeg-kit-react-native';
import {AppError, ensureOnline, Verse} from './api';
import type {Part} from './parts';
import {
  FADE_SECONDS,
  MAX_STEPS,
  MIN_STEP_SECONDS,
  PADDING_SECONDS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
} from './config';

export type Step = string; // e.g. 'Downloading audio 3/12'

const strip = (p: string) => p.replace(/^file:\/\//, '');

// Android 9 and below need WRITE_EXTERNAL_STORAGE; newer versions and iOS don't.
async function ensureSavePermission() {
  if (Platform.OS === 'android' && Platform.Version <= 28) {
    const res = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    );
    if (res !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new AppError('Permission denied. Allow storage access to save the video.');
    }
  }
}

export async function saveToGallery(path: string) {
  await ensureSavePermission();
  try {
    await CameraRoll.saveAsset(`file://${path}`, {type: 'video'});
  } catch {
    throw new AppError('Could not save to the gallery. Check permissions.');
  }
}

type StepPlan = {verse: number; lit: number; begin: number};

// Highlight steps across the whole video. `begin` is when each step starts on the
// final timeline (seconds). Step 0 shows the first verse fully dimmed.
function planSteps(verses: Verse[], offsetsMs: number[]): StepPlan[] {
  const totalWords = verses.reduce((n, v) => n + v.words.length, 0);
  const per = Math.max(1, Math.ceil(totalWords / MAX_STEPS));
  const steps: StepPlan[] = [{verse: 0, lit: 0, begin: 0}];
  verses.forEach((v, vi) => {
    for (let i = 0; i < v.words.length; i += per) {
      const begin = PADDING_SECONDS + (offsetsMs[vi] + v.timings[i].start) / 1000;
      const lit = Math.min(i + per, v.words.length);
      const prev = steps[steps.length - 1];
      if (steps.length > 1 && begin - prev.begin < MIN_STEP_SECONDS) {
        if (prev.verse === vi) {
          prev.lit = lit; // same verse: light more words in the previous step
          continue;
        }
        steps.pop(); // new verse arrives too soon: skip the flash of the old one
      }
      steps.push({verse: vi, lit, begin});
    }
  });
  return steps;
}

async function mediaSeconds(path: string, fallback: number) {
  try {
    const s = await FFprobeKit.getMediaInformation(path);
    const d = Number(s.getMediaInformation().getDuration());
    return Number.isFinite(d) && d > 0 ? d : fallback;
  } catch {
    return fallback;
  }
}

// Returns the path of the finished reel inside app storage.
// renderFrame(verseIndex, litWords) must show that frame and resolve once it is drawn.
export type Generated = {videoPath: string; thumbPath: string; thumbMs: number};

export async function generateVideo(
  part: Part,
  frameRef: React.RefObject<View | null>,
  renderFrame: (verseIndex: number, litWords: number) => Promise<void>,
  onStep: (s: Step) => void,
): Promise<Generated> {
  const id = `part_${part.startGlobal}_${Date.now()}`;
  const dir = RNFS.CachesDirectoryPath;
  const reelsDir = `${RNFS.DocumentDirectoryPath}/reels`;
  const videoPath = `${reelsDir}/part_${part.startGlobal}.mp4`;
  const thumbPath = `${reelsDir}/part_${part.startGlobal}.png`;
  const audioPaths: string[] = [];
  const chapterFiles = new Map<string, string>(); // whole-surah downloads, shared by verses
  const pngPaths: string[] = [];
  let ok = false;

  try {
    await RNFS.mkdir(reelsDir);
    await ensureSavePermission();
    await ensureOnline();

    const verses = part.verses;
    for (let i = 0; i < verses.length; i++) {
      onStep(`Downloading audio ${i + 1}/${verses.length}`);
      const v = verses[i];
      const path = `${dir}/${id}_${i}.${v.clip ? 'm4a' : 'mp3'}`;
      audioPaths.push(path);
      try {
        let src = path;
        if (v.clip) {
          src = chapterFiles.get(v.audioUrl) ?? `${dir}/${id}_chapter${chapterFiles.size}.mp3`;
          if (!chapterFiles.has(v.audioUrl)) {
            chapterFiles.set(v.audioUrl, src);
            const dl = await RNFS.downloadFile({fromUrl: v.audioUrl, toFile: src}).promise;
            if (dl.statusCode !== 200) {
              throw new Error(String(dl.statusCode));
            }
          }
          // Cut this verse out of the surah file.
          const from = (v.clip.fromMs / 1000).toFixed(3);
          const len = ((v.clip.toMs - v.clip.fromMs) / 1000).toFixed(3);
          const cut = await FFmpegKit.execute(
            `-y -ss ${from} -t ${len} -i "${src}" -vn -c:a aac -b:a 128k "${path}"`,
          );
          if (!ReturnCode.isSuccess(await cut.getReturnCode())) {
            throw new Error('cut failed');
          }
        } else {
          const dl = await RNFS.downloadFile({fromUrl: v.audioUrl, toFile: path}).promise;
          if (dl.statusCode !== 200) {
            throw new Error(String(dl.statusCode));
          }
        }
      } catch {
        throw new AppError('Audio download failed. Please try again.');
      }
    }

    onStep('Creating video');
    // Exact length of every verse file, to line word timings up on one timeline.
    const durs: number[] = [];
    for (let i = 0; i < verses.length; i++) {
      durs.push(await mediaSeconds(audioPaths[i], verses[i].estimatedMs / 1000));
    }
    const offsetsMs: number[] = [];
    let acc = 0;
    for (const d of durs) {
      offsetsMs.push(acc * 1000);
      acc += d;
    }
    const total = PADDING_SECONDS * 2 + acc;
    const steps = planSteps(verses, offsetsMs);

    // One frame per step. width/height set the output pixels,
    // independent of device pixel ratio.
    for (let i = 0; i < steps.length; i++) {
      onStep(`Creating video (frame ${i + 1}/${steps.length})`);
      await renderFrame(steps[i].verse, steps[i].lit);
      const shot = await captureRef(frameRef, {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
      });
      const png = `${dir}/${id}_${i}.png`;
      pngPaths.push(png);
      await RNFS.copyFile(strip(shot), png);
      await RNFS.unlink(strip(shot)).catch(() => {});
    }

    // Cover image: first verse with all its words lit, a moment before the next verse.
    let thumbIdx = 0;
    steps.forEach((st, i) => {
      if (st.verse === 0 && st.lit >= steps[thumbIdx].lit) {
        thumbIdx = i;
      }
    });
    await RNFS.copyFile(pngPaths[thumbIdx], thumbPath);
    const thumbMs = Math.round(Math.min(steps[thumbIdx].begin + 0.3, total - 0.5) * 1000);

    onStep('Creating video (encoding)');
    // Crossfade step i-1 -> i centred on begin[i], so the highlight lands on the word.
    const F = FADE_SECONDS;
    const n = steps.length;
    const begin = steps.map(s => s.begin);
    const lens = steps.map((_, i) =>
      i === 0
        ? begin[1] + F / 2 + 0.2 // small margin so each input outlasts its fade
        : i === n - 1
        ? total - (begin[i] - F / 2) + 0.5
        : begin[i + 1] - begin[i] + F + 0.2,
    );
    const imgInputs = pngPaths
      .map((p, i) => `-framerate 30 -loop 1 -t ${lens[i].toFixed(3)} -i "${p}"`)
      .join(' ');
    const audInputs = audioPaths.map(p => `-i "${p}"`).join(' ');
    const prep = pngPaths
      .map((_, i) => `[${i}:v]fps=30,format=yuv420p,setsar=1[v${i}]`)
      .join(';');
    let chain = '';
    let prev = 'v0';
    for (let i = 1; i < n; i++) {
      const out = i === n - 1 ? 'vout' : `x${i}`;
      chain += `;[${prev}][v${i}]xfade=transition=fade:duration=${F}:offset=${(
        begin[i] - F / 2
      ).toFixed(3)}[${out}]`;
      prev = out;
    }
    // Join the verse files, then add 0.5s of silence at both ends.
    const aPrep = audioPaths
      .map((_, i) => `[${n + i}:a]aresample=44100,aformat=channel_layouts=stereo[a${i}]`)
      .join(';');
    const aJoin = audioPaths.map((_, i) => `[a${i}]`).join('');
    const padMs = Math.round(PADDING_SECONDS * 1000);
    const audio =
      `;${aPrep};${aJoin}concat=n=${audioPaths.length}:v=0:a=1[ac]` +
      `;[ac]adelay=${padMs}:all=1,apad=pad_dur=${PADDING_SECONDS}[a]`;
    const cmd =
      `-y ${imgInputs} ${audInputs} -filter_complex "${prep}${chain}${audio}" ` +
      `-map "[vout]" -map "[a]" -c:v libx264 -tune stillimage -preset ultrafast ` +
      `-pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -ar 44100 -ac 2 ` +
      `-movflags +faststart -shortest "${videoPath}"`;
    const session = await FFmpegKit.execute(cmd);
    if (!ReturnCode.isSuccess(await session.getReturnCode())) {
      throw new AppError('Video creation failed (FFmpeg error).');
    }

    onStep('Saving');
    await saveToGallery(videoPath);
    ok = true;
    return {videoPath, thumbPath, thumbMs};
  } finally {
    // Keep the final mp4 only on success.
    const temp = [...pngPaths, ...audioPaths, ...chapterFiles.values(), ...(ok ? [] : [videoPath, thumbPath])];
    await Promise.all(temp.map(p => RNFS.unlink(p).catch(() => {})));
  }
}
