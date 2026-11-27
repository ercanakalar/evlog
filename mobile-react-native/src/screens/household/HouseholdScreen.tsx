import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { Button, Card, ErrorView, Loading, Rule, Screen, ScreenHeader, Text } from '@/components/ui';
import { useFormatters } from '@/hooks/common/useFormatters';
import { useHousehold } from '@/hooks/household/useHousehold';
import { useTheme } from '@/theme';
import { initials } from '@/utils/format';

/** The people who share this Raf: same receipts, shelf, at-home counts, lists and spending. */
export function HouseholdScreen() {
  const { t } = useTranslation();
  const { colors, fonts } = useTheme();
  const f = useFormatters();
  const h = useHousehold();

  if (h.isLoading) return <Loading />;
  if (!h.household) return <ErrorView error={h.error} onRetry={h.refetch} />;
  const { members, invite } = h.household;

  return (
    <Screen header={<ScreenHeader back title={t('household.title')} />} gap={16}>
      <Text variant="small" muted>
        {t('household.about')}
      </Text>

      <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
        {members.map((member, index) => (
          <View key={member.id}>
            {index > 0 ? <Rule /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 }}>
              <View
                accessibilityElementsHidden
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Text variant="label" color={colors.onAccent} style={{ fontFamily: fonts.bodySemiBold }}>
                  {initials(member.fullName)}
                </Text>
              </View>
              <View style={{ flexShrink: 1, gap: 1 }}>
                <Text variant="bodyStrong">{member.me ? t('household.you', { name: member.fullName }) : member.fullName}</Text>
                <Text variant="small" muted numberOfLines={1}>
                  {member.email}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </Card>

      {h.full ? (
        <Text variant="small" muted>
          {t('household.full', { count: h.household.maxMembers })}
        </Text>
      ) : invite ? (
        <Card tone="ink" style={{ gap: 12, alignItems: 'center', paddingVertical: 18 }}>
          <Text variant="small" color={colors.onInkMuted}>
            {t('household.codeFor')}
          </Text>
          <Text
            variant="amountL"
            color={colors.accent}
            accessibilityLabel={invite.code.split('').join(' ')}
            style={{ letterSpacing: 3 }}>
            {invite.code}
          </Text>
          <Text variant="small" color={colors.onInkMuted} style={{ textAlign: 'center' }}>
            {t('household.validUntil', { when: `${f.day(invite.expiresAt)} ${f.time(invite.expiresAt)}` })}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 8 }}>
            <Button title={t('household.share')} variant="accent" compact onPress={h.shareInvite} />
            <Pressable
              accessibilityRole="button"
              onPress={h.cancelInvite}
              style={({ pressed }) => ({ minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
              <Text variant="label" color={colors.onInk} style={{ textDecorationLine: 'underline' }}>
                {t('household.cancelCode')}
              </Text>
            </Pressable>
          </View>
        </Card>
      ) : (
        <Button title={t('household.invite')} variant="accent" loading={h.inviting} onPress={h.invite} />
      )}

      {h.shared ? (
        <Button title={t('household.leave')} variant="danger" loading={h.leaving} onPress={h.leave} compact />
      ) : (
        <View style={{ gap: 6 }}>
          <Button title={t('household.joinOther')} variant="outline" onPress={h.join} />
          <Text variant="caption" muted style={{ textAlign: 'center' }}>
            {t('household.joinHint')}
          </Text>
        </View>
      )}
    </Screen>
  );
}
