import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Text } from '@/components/ui';
import { radius } from '@/constants/layout';
import { conditionPhotoPath, useAuthedImage } from '@/hooks/common/useAuthedImage';
import { useTheme } from '@/theme';
import type { ConditionPhoto } from '@/types/api/models';

function Photo({ photo }: { photo: ConditionPhoto }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const source = useAuthedImage(conditionPhotoPath(photo.id));
  return (
    <View style={{ width: '31.5%', gap: 2 }}>
      <Image
        source={source}
        contentFit="cover"
        accessibilityLabel={t(`rooms.${photo.room}`)}
        style={{ width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.cardMuted }}
      />
      <Text variant="caption" muted numberOfLines={1}>
        {t(`rooms.${photo.room}`)}
      </Text>
    </View>
  );
}

export function PhotoGrid({ photos }: { photos: ConditionPhoto[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {photos.map((p) => (
        <Photo key={p.id} photo={p} />
      ))}
    </View>
  );
}
