import { Pressable, View } from 'react-native';
import { HIT } from '@/constants/layout';
import { useTheme } from '@/theme';

/** The ink-and-lime toggle from the settings mockup. */
export function Switch({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={{ width: 52, height: HIT, justifyContent: 'center' }}>
      <View
        style={{
          width: 50,
          height: 30,
          padding: 3,
          borderRadius: 15,
          flexDirection: 'row',
          justifyContent: value ? 'flex-end' : 'flex-start',
          backgroundColor: value ? colors.ink : colors.switchOff,
        }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: value ? colors.accent : colors.card }} />
      </View>
    </Pressable>
  );
}
