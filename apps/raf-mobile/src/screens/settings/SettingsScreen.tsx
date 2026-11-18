import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { SettingGroup, SwitchRow, ValueRow } from '@/components/settings/SettingRows';
import { Button, Card, ErrorView, Loading, Rule, Screen, ScreenHeader, Segmented, Text } from '@/components/ui';
import { REMINDER_LEAD_DAYS } from '@/constants/domain';
import { useSettings } from '@/hooks/settings/useSettings';
import { fonts, useTheme } from '@/theme';
import { initials } from '@/utils/format';

export function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const s = useSettings();

  if (s.isLoading) return <Loading />;
  if (!s.me) return <ErrorView error={s.error} onRetry={s.refetch} />;
  const { me } = s;
  const method = me.signInMethods.includes('google') ? t('settings.viaGoogle') : t('settings.viaEmail');

  return (
    <Screen header={<ScreenHeader back title={t('settings.title')} />} gap={16}>
      <Card tone="ink" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View
          accessibilityElementsHidden
          style={{
            width: 46,
            height: 46,
            borderRadius: 23,
            backgroundColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Text variant="bodyStrong" color={colors.onAccent} style={{ fontFamily: fonts.bodySemiBold }}>
            {initials(me.fullName)}
          </Text>
        </View>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Text variant="bodyStrong" color={colors.onInk} style={{ fontSize: 15.5 }}>
            {me.fullName}
          </Text>
          <Text variant="small" color={colors.onInkMuted} numberOfLines={1}>
            {`${me.email} · ${method}`}
          </Text>
        </View>
      </Card>

      <SettingGroup title={t('settings.countdown')}>
        <SwitchRow label={t('settings.reminders')} value={me.expiryReminders} onChange={(v) => s.set({ expiryReminders: v })} />
        {me.expiryReminders ? (
          <View style={{ paddingTop: 10, paddingBottom: 12, gap: 8 }}>
            <Rule style={{ marginTop: -10, marginBottom: 2 }} />
            <Text variant="bodyMedium" style={{ fontSize: 14 }}>
              {t('settings.remindBefore')}
            </Text>
            <Segmented<number>
              value={me.reminderLeadDays}
              onChange={(v) => s.set({ reminderLeadDays: v })}
              options={REMINDER_LEAD_DAYS.map((n) => ({ value: n, label: t('settings.leadDays', { count: n }) }))}
            />
          </View>
        ) : null}
      </SettingGroup>

      <SettingGroup title={t('settings.atHome')}>
        <SwitchRow label={t('settings.trackHome')} value={me.trackHomeItems} onChange={(v) => s.set({ trackHomeItems: v })} />
        {me.trackHomeItems ? (
          <SwitchRow
            divider
            label={t('settings.countFromReceipts')}
            value={me.countFromReceipts}
            onChange={(v) => s.set({ countFromReceipts: v })}
          />
        ) : null}
      </SettingGroup>

      <SettingGroup title={t('settings.shopping')}>
        <ValueRow label={t('settings.currency')} value={t(`currencies.${me.currency as 'TRY'}`, { defaultValue: me.currency })} onPress={s.pickCurrency} />
        <ValueRow divider label={t('settings.categories')} value={String(me.categoryCount)} onPress={() => navigation.navigate('Spending')} />
        <ValueRow
          divider
          label={t('settings.markets')}
          value={String(me.marketCount)}
          onPress={() => navigation.navigate('Tabs', { screen: 'Trips' })}
        />
      </SettingGroup>

      <SettingGroup title={t('settings.app')}>
        <ValueRow label={t('settings.language')} value={t(`settings.languages.${s.language}`)} onPress={s.pickLanguage} />
        <ValueRow divider label={t('settings.theme')} value={t(`settings.themes.${s.theme}`)} onPress={s.pickTheme} />
        <SwitchRow divider label={t('settings.usage')} value={s.usageReporting} onChange={s.setUsageReporting} />
      </SettingGroup>

      <View style={{ gap: 8 }}>
        <Button title={t('settings.logOut')} variant="outline" onPress={s.logOut} style={{ minHeight: 50, borderRadius: 10, backgroundColor: 'transparent' }} />
        <Button title={t('settings.deleteAccount')} variant="danger" loading={s.deleting} onPress={s.deleteAccount} compact />
      </View>
    </Screen>
  );
}
