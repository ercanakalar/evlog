import { View } from 'react-native';
import { Text } from '@/components/ui';
import { ReceiptEdge } from '@/components/ui/ReceiptPaper';
import { useTheme } from '@/theme';

/**
 * The sign-in illustration: a slip of receipt paper hanging from the top,
 * listing products with their countdown; the first line is highlighted.
 */
export function ReceiptHero({ lines }: { lines: [string, string][] }) {
  const { colors } = useTheme();
  const paper = '#FCFCFA';
  const ink = '#15181A';
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: 262, backgroundColor: colors.accent, alignItems: 'center' }}>
      <View style={{ width: 280, height: 226 }}>
        <View style={{ flex: 1, backgroundColor: paper, paddingTop: 64, paddingHorizontal: 20, paddingBottom: 10, gap: 9 }}>
          <Text variant="screenTitle" color={ink} style={{ textAlign: 'center', letterSpacing: 1.8, paddingBottom: 6 }}>
            RAF
          </Text>
          {lines.map(([name, left], i) => (
            <View
              key={name}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                ...(i === 0 ? { backgroundColor: colors.accent, marginHorizontal: -6, paddingHorizontal: 6, paddingVertical: 2 } : {}),
              }}>
              <Text variant={i === 0 ? 'monoBold' : 'mono'} color={ink} style={{ fontSize: 12 }}>
                {name}
              </Text>
              <Text variant={i === 0 ? 'monoBold' : 'mono'} color={ink} style={{ fontSize: 12 }}>
                {left}
              </Text>
            </View>
          ))}
        </View>
        <ReceiptEdge color={paper} />
      </View>
    </View>
  );
}
