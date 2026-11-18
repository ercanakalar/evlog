import Feather from '@expo/vector-icons/Feather';
import { View } from 'react-native';
import { Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';
import type { IconName } from '@/types/components/ui';

export function FeatureTile({
  icon,
  title,
  subtitle,
  warm,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  warm?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Card
        tone={warm ? 'warm' : 'default'}
        onPress={onPress}
        accessibilityLabel={`${title}, ${subtitle}`}
        style={{ minHeight: 96, justifyContent: 'space-between' }}>
        <Feather name={icon} size={18} color={warm ? colors.warmText : colors.text} />
        <View>
          <Text variant="label">{title}</Text>
          <Text variant="caption" color={warm ? colors.warmText : colors.textMuted} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </Card>
    </View>
  );
}
