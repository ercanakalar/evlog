import { View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

/** Small label on a line: category, shelf life, "At home +1". */
export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' }) {
  const { colors, fonts } = useTheme();
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: tone === 'accent' ? colors.accent : colors.tag,
      }}>
      <Text
        variant="caption"
        color={tone === 'accent' ? colors.onAccent : colors.text}
        style={{ fontSize: 12, fontFamily: tone === 'accent' ? fonts.bodySemiBold : fonts.bodyMedium }}>
        {label}
      </Text>
    </View>
  );
}
