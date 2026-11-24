import { useTranslation } from 'react-i18next';
import { FontRow, PaletteRow, SettingGroup, SwitchRow, ValueRow } from '@/components/settings/SettingRows';
import { Screen, ScreenHeader, Text } from '@/components/ui';
import { useSettings } from '@/hooks/profile/useSettings';

/** App-wide preferences: appearance and language apply to every tab, Groceries included. */
export function SettingsScreen() {
  const { t } = useTranslation();
  const s = useSettings();
  return (
    <Screen header={<ScreenHeader back title={t('settings.title')} />} gap={18}>
      <SettingGroup title={t('settings.appearance')}>
        <ValueRow label={t('settings.mode')} value={t(`settings.theme.${s.theme}`)} onPress={s.pickTheme} />
        <PaletteRow divider label={t('settings.palette')} value={s.palette} onChange={s.setPalette} nameOf={(p) => t(`settings.palettes.${p}`)} />
        <FontRow divider label={t('settings.font')} value={s.font} onChange={s.setFont} nameOf={(f) => t(`settings.fonts.${f}`)} />
      </SettingGroup>

      <SettingGroup title={t('settings.language')}>
        <ValueRow label={t('settings.language')} value={t(`settings.languages.${s.language}`)} onPress={s.pickLanguage} />
      </SettingGroup>

      {s.groceriesAvailable ? (
        <SettingGroup title={t('settings.accounts')}>
          <ValueRow
            label={t('settings.groceries')}
            value={s.groceriesConnected ? '' : t('settings.notConnected')}
            onPress={s.openGroceries}
          />
        </SettingGroup>
      ) : null}

      <SettingGroup title={t('settings.privacy')}>
        <SwitchRow label={t('settings.usageReporting')} value={s.usageReporting} onChange={s.setUsageReporting} />
        <Text variant="small" muted style={{ paddingBottom: 12 }}>
          {t('settings.usageReportingHint')}
        </Text>
      </SettingGroup>
    </Screen>
  );
}
