import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui';
import { radius } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { HomeUnit } from '@/types/api/groceries/models';

/** Compact "Piece | kg" switch beside the add field. */
export function UnitToggle({ value, onChange }: { value: HomeUnit; onChange: (unit: HomeUnit) => void }) {
  const { t } = useTranslation('groceries');
  const { colors } = useTheme();
  const options: { value: HomeUnit; label: string; a11y: string }[] = [
    { value: 'PIECE', label: t('atHome.piece'), a11y: t('atHome.countPieces') },
    { value: 'KG', label: t('atHome.kg'), a11y: t('atHome.countKg') },
  ];
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={t('atHome.unit')}
      style={{ flexDirection: 'row', height: 46, padding: 3, gap: 2, borderRadius: radius.md, backgroundColor: colors.cardMuted }}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityLabel={o.a11y}
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={{
              minWidth: 44,
              paddingHorizontal: 8,
              borderRadius: radius.md - 3,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? colors.card : 'transparent',
            }}>
            <Text variant="label" style={{ fontSize: 13 }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
