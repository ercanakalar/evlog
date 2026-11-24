import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

/**
 * A dashed rule, like the lines printed on a receipt. iOS cannot dash a
 * single border side, so a fully dashed box is clipped to its top edge.
 */
export function Rule({ strong, style }: { strong?: boolean; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ height: 1, overflow: 'hidden' }, style]}>
      <View
        style={{
          height: 3,
          borderWidth: 1,
          borderStyle: 'dashed',
          borderColor: strong ? colors.inputBorder : colors.rule,
        }}
      />
    </View>
  );
}
