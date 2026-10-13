import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import {VIDEO_HEIGHT, VIDEO_WIDTH} from './config';
import type {Verse} from './api';

const MARGIN = 80;
const TEXT_WIDTH = VIDEO_WIDTH - MARGIN * 2;
// Vertical room for Arabic and English blocks.
const ARABIC_BOX = 900;
const ENGLISH_BOX = 480;
const ARABIC_LINE = 1.9;
const ENGLISH_LINE = 1.4;
const DIM = 'rgba(255,255,255,0.28)';

// Count only base letters; diacritics take no horizontal space.
const countLetters = (s: string) =>
  s.replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '').length;

// Estimate the largest font size whose wrapped text fits the box:
// lines * lineHeight = chars * avgCharWidth * size / width * size * lineHeight
function fitSize(chars: number, box: number, avgW: number, line: number, max: number, min: number) {
  const size = Math.sqrt((box * TEXT_WIDTH) / (Math.max(chars, 1) * avgW * line));
  return Math.floor(Math.max(min, Math.min(max, size)));
}

// `lit` = number of Arabic words already recited (shown bright); the rest are dimmed.
type Props = {verse: Verse | null; lit: number; pageName?: string};

const FrameView = React.forwardRef<View, Props>(({verse, lit, pageName}, ref) => {
  if (!verse) {
    return null;
  }
  const arabicSize = fitSize(countLetters(verse.arabic), ARABIC_BOX, 0.5, ARABIC_LINE, 96, 28);
  const englishSize = fitSize(verse.translation.length, ENGLISH_BOX, 0.52, ENGLISH_LINE, 48, 20);

  return (
    // Laid out at exactly 1080x1920 dp, parked off-screen.
    <View ref={ref} collapsable={false} style={styles.frame}>
      <View style={styles.center}>
        <Text
          style={[
            styles.arabic,
            {fontSize: arabicSize, lineHeight: arabicSize * ARABIC_LINE},
          ]}>
          {verse.words.map((w, i) => (
            <Text key={i} style={{color: i < lit ? '#fff' : DIM}}>
              {i < verse.words.length - 1 ? `${w} ` : w}
            </Text>
          ))}
        </Text>
        <Text
          style={[
            styles.english,
            {fontSize: englishSize, lineHeight: englishSize * ENGLISH_LINE},
          ]}>
          {verse.translation}
        </Text>
      </View>
      {!!pageName && <Text style={styles.stamp}>{pageName}</Text>}
      <Text style={styles.reference}>
        {`Surah ${verse.surahName} ${verse.surahNumber}:${verse.ayahNumber}`}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  frame: {
    position: 'absolute',
    top: 0,
    left: -VIDEO_WIDTH - 100,
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    backgroundColor: '#000',
    paddingHorizontal: MARGIN,
    paddingTop: 120,
    paddingBottom: 120,
  },
  center: {flex: 1, justifyContent: 'center'},
  arabic: {
    color: '#fff',
    fontFamily: 'Amiri-Regular',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 60,
  },
  english: {
    color: '#fff',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'Helvetica Neue',
    textAlign: 'center',
  },
  stamp: {
    position: 'absolute',
    top: 56,
    right: 56,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'Helvetica Neue',
    fontSize: 30,
  },
  reference: {
    color: '#fff',
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : 'Helvetica Neue',
    fontSize: 36,
    textAlign: 'center',
  },
});

export default FrameView;
