import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {AppError, Verse} from './src/api';
import AppButton from './src/AppButton';
import {buildCaption} from './src/caption';
import {TOTAL_AYAHS} from './src/config';
import FrameView from './src/FrameView';
import {postReel} from './src/instagram';
import {loadPart, neighbour, Part, partLabel} from './src/parts';
import CreateScreen from './src/screens/CreateScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import VideosScreen from './src/screens/VideosScreen';
import {
  addReel,
  deleteReel,
  getLastCompleted,
  getReels,
  getSettings,
  markPosted,
  Reel,
  resetProgress,
  setLastCompleted,
  Settings,
  setSettings,
} from './src/storage';
import {generateVideo, saveToGallery} from './src/videoGenerator';

type Tab = 'create' | 'videos' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('create');
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [position, setPosition] = useState(1); // global number of the first verse of the next video
  const [completed, setCompleted] = useState(0);
  const [part, setPart] = useState<Part | null>(null);
  const [frame, setFrame] = useState<{verse: Verse | null; lit: number}>({verse: null, lit: 0});
  const [step, setStep] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [reels, setReels] = useState<Reel[]>([]);
  const frameRef = useRef<View>(null);
  const busy = step !== null;
  const reciterId = settings?.reciterId;

  useEffect(() => {
    getSettings().then(setSettingsState);
    getReels().then(setReels);
    getLastCompleted().then(n => {
      setCompleted(n);
      setPosition(Math.min(n + 1, TOTAL_AYAHS));
    });
  }, []);

  const fail = (e: unknown, fallback: string) =>
    setMessage(e instanceof AppError ? e.message : fallback);

  const loadPreview = useCallback(async (g: number, rid: number) => {
    setPart(null);
    try {
      setPart(await loadPart(g, rid));
    } catch (e) {
      fail(e, 'Could not load the verses.');
    }
  }, []);

  useEffect(() => {
    if (reciterId !== undefined) {
      loadPreview(position, reciterId);
    }
  }, [position, reciterId, loadPreview]);

  const move = async (dir: 1 | -1) => {
    if (!part) {
      return;
    }
    try {
      const g = await neighbour(part, dir);
      if (g) {
        setPosition(g);
      }
    } catch (e) {
      fail(e, 'Could not load the verses.');
    }
  };

  const onGenerate = async () => {
    if (!part || !settings) {
      return;
    }
    setMessage('');
    try {
      setStep('Preparing');
      // Let the off-screen frame mount before the first capture.
      setFrame({verse: part.verses[0], lit: 0});
      await new Promise<void>(r => setTimeout(r, 600));
      const out = await generateVideo(
        part,
        frameRef,
        (vi, lit) =>
          new Promise<void>(r => {
            setFrame({verse: part.verses[vi], lit});
            setTimeout(r, 250); // wait for the re-render before capture
          }),
        setStep,
      );
      const caption = buildCaption(part);
      await addReel({
        id: part.startGlobal,
        title: partLabel(part),
        caption,
        path: out.videoPath,
        thumbPath: out.thumbPath,
        thumbMs: out.thumbMs,
        createdAt: Date.now(),
      });
      setReels(await getReels());
      Clipboard.setString(caption); // ready to paste when posting
      const done = Math.max(completed, part.endGlobal);
      await setLastCompleted(done);
      setCompleted(done);
      setMessage('Saved to gallery and Videos (caption copied)');
      const next = await neighbour(part, 1);
      if (next) {
        setPosition(next);
      }
    } catch (e) {
      fail(e, 'Something went wrong.');
    } finally {
      setStep(null);
    }
  };

  // Reels go out strictly in order: only the earliest unposted one can be posted.
  const nextToPost = reels
    .filter(r => !r.postedAt)
    .reduce<Reel | null>((a, r) => (!a || r.id < a.id ? r : a), null);

  const onPost = async (r: Reel) => {
    if (!settings) {
      return;
    }
    setMessage('');
    try {
      setStep('Instagram: starting');
      await postReel(r, {userId: settings.igUserId, token: settings.igToken}, setStep);
      await markPosted(r.id);
      setReels(await getReels());
      setMessage('Posted to Instagram');
    } catch (e) {
      fail(e, 'Instagram post failed.');
    } finally {
      setStep(null);
    }
  };

  const onSaveAgain = async (r: Reel) => {
    try {
      await saveToGallery(r.path);
      setMessage('Saved to gallery');
    } catch (e) {
      fail(e, 'Could not save.');
    }
  };

  const onDeleteReel = (r: Reel) =>
    Alert.alert('Delete video', `Delete ${r.title} from this app?`, [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteReel(r);
          setReels(await getReels());
        },
      },
    ]);

  const onSaveSettings = async (s: Settings) => {
    await setSettings(s);
    setSettingsState(s);
    setMessage('Settings saved');
  };

  const onReset = () =>
    Alert.alert('Reset progress', 'Start again from Al-Fatihah 1:1?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await resetProgress();
          setCompleted(0);
          setPosition(1);
          setMessage('');
        },
      },
    ]);

  const copy = (text: string) => {
    Clipboard.setString(text);
    setMessage('Caption copied');
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.tabs}>
        {(['create', 'videos', 'settings'] as Tab[]).map(t => (
          <Pressable
            key={t}
            style={[styles.tab, tab === t && styles.tabOn]}
            onPress={() => {
              setTab(t);
              setMessage('');
            }}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'videos' ? `Videos (${reels.length})` : t[0].toUpperCase() + t.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {busy && (
          <View style={styles.row}>
            <ActivityIndicator />
            <Text style={styles.step}>{step}</Text>
          </View>
        )}
        {!!message && <Text style={styles.message}>{message}</Text>}

        {tab === 'create' && (
          <CreateScreen
            part={part}
            position={position}
            completed={completed}
            busy={busy}
            onMove={move}
            onGenerate={onGenerate}
            onCopyCaption={() => part && copy(buildCaption(part))}
          />
        )}
        {tab === 'videos' && (
          <VideosScreen
            reels={reels}
            nextToPost={nextToPost}
            busy={busy}
            onPost={onPost}
            onSave={onSaveAgain}
            onCopy={r => copy(r.caption)}
            onDelete={onDeleteReel}
          />
        )}
        {tab === 'settings' && settings && (
          <>
            <SettingsScreen settings={settings} onSave={onSaveSettings} />
            <View style={styles.gap} />
            <AppButton title="Reset progress" variant="plain" disabled={busy} onPress={onReset} />
          </>
        )}
      </ScrollView>
      <FrameView
        ref={frameRef}
        verse={frame.verse}
        lit={frame.lit}
        pageName={settings?.pageName}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#fff'},
  tabs: {flexDirection: 'row', borderBottomWidth: 1, borderColor: '#ddd'},
  tab: {flex: 1, paddingVertical: 14, alignItems: 'center'},
  tabOn: {borderBottomWidth: 3, borderColor: '#000'},
  tabText: {color: '#777', fontWeight: '600'},
  tabTextOn: {color: '#000'},
  content: {padding: 20},
  row: {flexDirection: 'row', alignItems: 'center', marginBottom: 8},
  step: {color: '#000', marginLeft: 10},
  message: {color: '#000', marginBottom: 12, fontWeight: '600'},
  gap: {height: 24},
});
