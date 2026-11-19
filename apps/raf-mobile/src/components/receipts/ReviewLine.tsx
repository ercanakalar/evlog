import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, ChipRow, Field, Row, SpaceBetween, Tag, Text } from '@/components/ui';
import { CATEGORIES } from '@/constants/domain';
import { radius, space } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { Category, HomeUnit, ReceiptItem } from '@/types/api/models';

interface Props {
  item: ReceiptItem;
  currency: string;
  /** What saving adds to a matching at-home item. */
  atHome?: { amount: number; unit: HomeUnit };
  editable: boolean;
  onConfirm: () => void;
  onFix: (name: string, category: Category) => void;
  onRemove: () => void;
}

/**
 * One receipt line on the review screen: clean name, price, the text as
 * printed, and tags. Unsure matches get a red border and a "Yes" button;
 * tapping a line opens a small editor for its name and category.
 */
export function ReviewLine({ item, currency, atHome, editable, onConfirm, onFix, onRemove }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<Category>(item.category);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: item.needsReview ? colors.urgentBar : 'transparent' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint={t('review.editHint')}
        disabled={!editable}
        onPress={() => setEditing((v) => !v)}
        style={{ gap: 5 }}>
        <SpaceBetween style={{ alignItems: 'baseline' }}>
          <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
            {item.name}
          </Text>
          <Text variant="amount">{f.money(item.totalPrice, currency)}</Text>
        </SpaceBetween>
        <Text variant="monoSmall" muted>
          {item.rawName}
        </Text>
        <Row style={{ flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
          <Tag label={f.category(item.category)} />
          <Tag label={f.lasts(item.shelfLifeDays)} />
          {atHome ? <Tag label={t('review.atHomePlus', { amount: f.homeAmount(atHome.amount, atHome.unit) })} tone="accent" /> : null}
        </Row>
      </Pressable>

      {item.needsReview && editable && !editing ? (
        <SpaceBetween style={{ paddingTop: 4 }}>
          <Text variant="smallMedium" color={colors.urgentText} style={{ flexShrink: 1 }}>
            {t('review.rightProduct')}
          </Text>
          <Row>
            <Button title={t('review.no')} variant="outline" compact onPress={() => setEditing(true)} style={styles.small} />
            <Button title={t('review.yes')} compact onPress={onConfirm} style={styles.small} />
          </Row>
        </SpaceBetween>
      ) : null}

      {editing ? (
        <View style={{ gap: space.sm, paddingTop: 6 }}>
          <Field label={t('review.productName')} value={name} onChangeText={setName} />
          <ChipRow
            label={t('review.category')}
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: f.category(c) }))}
          />
          <Button
            title={t('common.done')}
            compact
            disabled={!name.trim()}
            onPress={() => {
              setEditing(false);
              onFix(name.trim(), category);
            }}
          />
          <Button
            title={t('review.removeLine')}
            variant="danger"
            compact
            onPress={() => {
              setEditing(false);
              onRemove();
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 11, gap: 5 },
  small: { minHeight: 44, paddingHorizontal: 16 },
});
