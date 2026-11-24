import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, ChipRow, Field, IconButton, Row, SpaceBetween, Tag, Text } from '@/components/ui';
import { CATEGORIES } from '@/constants/domain';
import { radius, space } from '@/constants/layout';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useTheme } from '@/theme';
import type { LineChoice } from '@/hooks/receipts/useReceiptReview';
import type { Category, ReceiptItem } from '@/types/api/models';

interface Props {
  item: ReceiptItem;
  currency: string;
  /** What saving does with the line: tracked or not, and what it adds at home. */
  choice?: LineChoice;
  editable: boolean;
  onTrack: (on: boolean) => void;
  onConfirm: () => void;
  onFix: (name: string, category: Category, quantity: number) => void;
  onRemove: () => void;
}

/**
 * One receipt line on the review screen: a checkbox, the clean name, price,
 * the text as printed, and tags, with a trash button to remove the line.
 * Checked (the default) means saving tracks it: a countdown on the shelf and
 * a count at home. Unsure matches get a red border and a "Yes" button;
 * tapping a line opens a small editor for its name and category.
 */
export function ReviewLine({ item, currency, choice, editable, onTrack, onConfirm, onFix, onRemove }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const f = useFormatters();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState<Category>(item.category);
  const byPiece = !item.unit || item.unit === 'pcs';
  const [quantity, setQuantity] = useState(String(Number(item.quantity)));
  const quantityValue = Number(quantity.replace(',', '.'));
  const quantityOk = byPiece ? Number.isInteger(quantityValue) && quantityValue >= 1 : quantityValue > 0;
  const tracked = choice?.tracked ?? true;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: item.needsReview ? colors.urgentBar : 'transparent' }]}>
      <Row style={{ alignItems: 'flex-start', gap: 8 }}>
        {editable ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel={t('review.track', { name: item.name })}
            accessibilityState={{ checked: tracked }}
            onPress={() => onTrack(!tracked)}
            hitSlop={8}
            style={styles.check}>
            <View style={[styles.box, { borderColor: colors.text, backgroundColor: tracked ? colors.accent : 'transparent' }]}>
              {tracked ? <Feather name="check" size={16} color={colors.onAccent} /> : null}
            </View>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityHint={t('review.editHint')}
          disabled={!editable}
          onPress={() => setEditing((v) => !v)}
          style={{ gap: 5, flex: 1, opacity: tracked ? 1 : 0.55 }}>
          <SpaceBetween style={{ alignItems: 'baseline' }}>
            <Text variant="bodyStrong" style={{ flexShrink: 1 }}>
              {item.name}
            </Text>
            <Text variant="amount">{f.money(item.totalPrice, currency)}</Text>
          </SpaceBetween>
          <Text variant="monoSmall" muted>
            {item.rawName}
          </Text>
          <Text variant="smallMedium" style={{ fontSize: 12.5 }}>
            {byPiece
              ? t('review.pieces', { count: Number(item.quantity) })
              : t('review.weight', { amount: f.homeAmount(Number(item.quantity), 'KG') })}
          </Text>
          <Row style={{ flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
            <Tag label={f.category(item.category)} />
            <Tag label={f.lasts(item.shelfLifeDays)} />
            {choice?.adds ? (
              <Tag label={t('review.atHomePlus', { amount: f.homeAmount(choice.adds.amount, choice.adds.unit) })} tone="accent" />
            ) : null}
            {choice?.newAtHome ? <Tag label={t('review.newAtHome', { name: choice.newAtHome })} tone="accent" /> : null}
            {!tracked ? <Tag label={t('review.notTracked')} /> : null}
          </Row>
        </Pressable>
        {editable ? (
          <IconButton
            icon="trash-2"
            iconSize={18}
            size={36}
            color={colors.textMuted}
            label={t('review.removeNamed', { name: item.name })}
            onPress={onRemove}
          />
        ) : null}
      </Row>

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
          <Field
            label={byPiece ? t('review.quantityPieces') : t('review.quantityKg')}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType={byPiece ? 'number-pad' : 'decimal-pad'}
            error={quantityOk ? undefined : t(byPiece ? 'review.quantityWhole' : 'review.quantityPositive')}
          />
          <ChipRow
            label={t('review.category')}
            value={category}
            onChange={setCategory}
            options={CATEGORIES.map((c) => ({ value: c, label: f.category(c) }))}
          />
          <Button
            title={t('common.done')}
            compact
            disabled={!name.trim() || !quantityOk}
            onPress={() => {
              setEditing(false);
              onFix(name.trim(), category, quantityValue);
            }}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  check: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -4 },
  box: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.md, borderWidth: 1.5, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 11, gap: 5 },
  small: { minHeight: 44, paddingHorizontal: 16 },
});
