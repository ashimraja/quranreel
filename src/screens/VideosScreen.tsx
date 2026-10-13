import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import AppButton from '../AppButton';
import type {Reel} from '../storage';

type Props = {
  reels: Reel[];
  nextToPost: Reel | null;
  busy: boolean;
  onPost: (r: Reel) => void;
  onSave: (r: Reel) => void;
  onCopy: (r: Reel) => void;
  onDelete: (r: Reel) => void;
};

export default function VideosScreen({reels, nextToPost, busy, onPost, onSave, onCopy, onDelete}: Props) {
  if (reels.length === 0) {
    return <Text style={styles.empty}>No videos yet. Create one in the Create tab.</Text>;
  }
  return (
    <View>
      {reels.map(r => (
        <View key={r.id} style={styles.card}>
          <View style={styles.head}>
            {r.thumbPath ? (
              <Image source={{uri: `file://${r.thumbPath}`}} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.noThumb]} />
            )}
            <View style={styles.flex}>
              <Text style={styles.name}>{r.title}</Text>
              <Text style={styles.meta}>{r.postedAt ? 'Posted to Instagram' : 'Not posted'}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            {!r.postedAt && (
              <View style={styles.half}>
                <AppButton
                  title="Post"
                  disabled={busy || nextToPost?.id !== r.id}
                  onPress={() => onPost(r)}
                />
              </View>
            )}
            <View style={styles.half}>
              <AppButton title="Gallery" variant="plain" disabled={busy} onPress={() => onSave(r)} />
            </View>
            <View style={styles.half}>
              <AppButton title="Caption" variant="plain" onPress={() => onCopy(r)} />
            </View>
            <View style={styles.half}>
              <AppButton title="Delete" variant="danger" disabled={busy} onPress={() => onDelete(r)} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {color: '#000', marginTop: 8},
  card: {borderTopWidth: 1, borderColor: '#ddd', paddingVertical: 12},
  head: {flexDirection: 'row', alignItems: 'center', marginBottom: 10},
  thumb: {width: 54, height: 96, borderRadius: 6, backgroundColor: '#000', marginRight: 12},
  noThumb: {opacity: 0.15},
  flex: {flex: 1},
  name: {color: '#000', fontWeight: '600'},
  meta: {color: '#555', marginTop: 2},
  // Two buttons per row so labels never get squeezed.
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  half: {width: '48%', flexGrow: 1},
});
