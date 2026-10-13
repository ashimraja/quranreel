import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

type Props = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'plain';
};

// Enabled = solid, dark, with press feedback. Disabled = pale grey, clearly inert.
export default function AppButton({title, onPress, disabled, variant = 'primary'}: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.base,
        variant === 'danger' && styles.danger,
        variant === 'plain' && styles.plain,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.text,
          variant === 'plain' && styles.plainText,
          disabled && styles.disabledText,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  danger: {backgroundColor: '#b00020'},
  plain: {backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#000'},
  pressed: {opacity: 0.6},
  disabled: {backgroundColor: '#eee', borderColor: '#ddd', borderWidth: 1},
  text: {color: '#fff', fontWeight: '600', fontSize: 15},
  plainText: {color: '#000'},
  disabledText: {color: '#aaa'},
});
