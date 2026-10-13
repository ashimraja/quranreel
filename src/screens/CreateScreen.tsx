import React from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import AppButton from '../AppButton';
import {buildCaption} from '../caption';
import {TOTAL_AYAHS} from '../config';
import {Part, partLabel} from '../parts';

type Props = {
  part: Part | null;
  position: number;
  completed: number;
  busy: boolean;
  onMove: (dir: 1 | -1) => void;
  onGenerate: () => void;
  onCopyCaption: () => void;
};

export default function CreateScreen({
  part,
  position,
  completed,
  busy,
  onMove,
  onGenerate,
  onCopyCaption,
}: Props) {
  const first = part?.verses[0];
  return (
    <View>
      <Text style={styles.title}>
        {part ? `Next video: ${partLabel(part)}` : `Next video: verse #${position}`}
      </Text>
      <Text style={styles.sub}>{`${completed} / ${TOTAL_AYAHS} verses completed`}</Text>

      <View style={styles.nav}>
        <View style={styles.flex}>
          <AppButton
            title="Previous"
            disabled={busy || !part || part.startGlobal <= 1}
            onPress={() => onMove(-1)}
          />
        </View>
        <View style={styles.flex}>
          <AppButton
            title="Next"
            disabled={busy || !part || part.endGlobal >= TOTAL_AYAHS}
            onPress={() => onMove(1)}
          />
        </View>
      </View>

      <View style={styles.preview}>
        {first ? (
          <>
            <Text style={styles.arabic}>{first.arabic}</Text>
            <Text style={styles.english}>{first.translation}</Text>
            {part.verses.length > 1 && (
              <Text style={styles.sub}>{`+ ${part.verses.length - 1} more verses in this video`}</Text>
            )}
          </>
        ) : (
          <ActivityIndicator />
        )}
      </View>

      {part && (
        <View style={styles.caption}>
          <Text style={styles.bold}>Caption</Text>
          <Text selectable style={styles.captionText}>
            {buildCaption(part)}
          </Text>
          <AppButton title="Copy caption" variant="plain" onPress={onCopyCaption} />
        </View>
      )}

      <AppButton
        title="Generate & Download Video"
        disabled={busy || !part}
        onPress={onGenerate}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: {color: '#000', fontSize: 18, fontWeight: '600'},
  sub: {color: '#000', marginTop: 4, marginBottom: 12},
  nav: {flexDirection: 'row', gap: 12, marginBottom: 12},
  flex: {flex: 1},
  preview: {minHeight: 120, marginBottom: 16},
  arabic: {color: '#000', fontSize: 26, lineHeight: 46, textAlign: 'right', marginBottom: 12},
  english: {color: '#000', fontSize: 16, lineHeight: 22},
  caption: {borderTopWidth: 1, borderColor: '#ddd', paddingTop: 12, marginBottom: 16},
  bold: {color: '#000', fontWeight: '600', marginBottom: 6},
  captionText: {color: '#000', marginBottom: 8, lineHeight: 20},
});
