import React, {useEffect, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import AppButton from '../AppButton';
import {RECITERS} from '../config';
import type {Settings} from '../storage';

type Props = {settings: Settings; onSave: (s: Settings) => void};

export default function SettingsScreen({settings, onSave}: Props) {
  const [draft, setDraft] = useState(settings);
  useEffect(() => setDraft(settings), [settings]);
  const set = (patch: Partial<Settings>) => setDraft({...draft, ...patch});

  return (
    <View>
      <Text style={styles.heading}>Page name stamp</Text>
      <Text style={styles.hint}>Shown small in the top-right corner of every new video. Leave empty for none.</Text>
      <TextInput
        style={styles.input}
        placeholder="@yourpage"
        placeholderTextColor="#888"
        autoCapitalize="none"
        value={draft.pageName}
        onChangeText={t => set({pageName: t})}
      />

      <Text style={styles.heading}>Reciter</Text>
      {RECITERS.map(r => (
        <Pressable key={r.id} style={styles.radioRow} onPress={() => set({reciterId: r.id})}>
          <View style={[styles.radio, draft.reciterId === r.id && styles.radioOn]} />
          <Text style={styles.radioText}>{r.name}</Text>
        </Pressable>
      ))}

      <Text style={styles.heading}>Instagram</Text>
      <TextInput
        style={styles.input}
        placeholder="Instagram user id"
        placeholderTextColor="#888"
        autoCapitalize="none"
        value={draft.igUserId}
        onChangeText={t => set({igUserId: t})}
      />
      <TextInput
        style={styles.input}
        placeholder="Access token"
        placeholderTextColor="#888"
        autoCapitalize="none"
        secureTextEntry
        value={draft.igToken}
        onChangeText={t => set({igToken: t})}
      />

      <AppButton title="Save settings" onPress={() => onSave(draft)} />
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {color: '#000', fontWeight: '700', fontSize: 16, marginTop: 16, marginBottom: 6},
  hint: {color: '#555', marginBottom: 6},
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    color: '#000',
  },
  radioRow: {flexDirection: 'row', alignItems: 'center', paddingVertical: 8},
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    marginRight: 10,
  },
  radioOn: {backgroundColor: '#000'},
  radioText: {color: '#000', fontSize: 16},
});
