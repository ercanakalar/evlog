import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { ReportLink } from '@/components/report/ReportLink';
import { Text } from '@/components/ui';
import { radius } from '@/constants/layout';
import { conditionPhotoPath, useAuthedImage } from '@/hooks/common/useAuthedImage';
import { useTheme } from '@/theme';
import type { ConditionPhoto } from '@/types/api/models';

function Photo({ photo, mine }: { photo: ConditionPhoto; mine: boolean }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const source = useAuthedImage(photo.hiddenAt ? undefined : conditionPhotoPath(photo.id));
  const frame = { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.cardMuted } as const;
  return (
    <View style={{ width: '31.5%', gap: 2 }}>
      {photo.hiddenAt ? (
        <View
          accessible
          accessibilityLabel={t('record.hiddenPhoto')}
          style={[frame, { alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 }]}>
          <Feather name="eye-off" size={18} color={colors.textMuted} />
          <Text variant="caption" muted style={{ textAlign: 'center' }}>
            {t('record.hiddenPhoto')}
          </Text>
        </View>
      ) : (
        <Image source={source} contentFit="cover" accessibilityLabel={t(`rooms.${photo.room}`)} style={frame} />
      )}
      <Text variant="caption" muted numberOfLines={1}>
        {t(`rooms.${photo.room}`)}
      </Text>
      {mine || photo.hiddenAt ? null : <ReportLink targetType="CONDITION_PHOTO" targetId={photo.id} />}
    </View>
  );
}

export function PhotoGrid({ photos, userId }: { photos: ConditionPhoto[]; userId: string | undefined }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {photos.map((p) => (
        <Photo key={p.id} photo={p} mine={p.uploadedById === userId} />
      ))}
    </View>
  );
}
