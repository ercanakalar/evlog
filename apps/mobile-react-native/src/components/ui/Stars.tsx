import { Pressable } from 'react-native';
import { useTheme } from '@/theme';
import { Row } from './Row';
import { Text } from './Text';

export function Stars({ value, onChange, size = 18 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const { colors } = useTheme();
  return (
    <Row style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${n}/5`}
          accessibilityState={{ selected: n <= value }}
          onPress={() => onChange?.(n)}>
          <Text style={{ fontSize: size, lineHeight: size + 2 }} color={n <= value ? colors.star : colors.starEmpty}>
            {n <= value ? '★' : '☆'}
          </Text>
        </Pressable>
      ))}
    </Row>
  );
}
