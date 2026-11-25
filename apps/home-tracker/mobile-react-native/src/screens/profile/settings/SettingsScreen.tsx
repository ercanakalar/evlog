import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';
import { Button, Card, Chip, Row, Screen, ScreenHeader, SectionHeader, Text } from '@/components/ui';
import { useSettings } from '@/hooks/profile/useSettings';
import { useTheme } from '@/theme';
import type { LanguagePreference, ThemePreference } from '@/types/store/state';

const THEMES: ThemePreference[] = ['system', 'light', 'dark'];
const LANGUAGES: LanguagePreference[] = ['system', 'en', 'tr'];

export function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = useSettings();
  return (
    <Screen>
      <ScreenHeader back title={t('settings.title')} />
      <SectionHeader title={t('settings.appearance')} />
      <Row>
        {THEMES.map((theme) => (
          <Chip key={theme} label={t(`settings.theme.${theme}`)} selected={s.theme === theme} onPress={() => s.setTheme(theme)} />
        ))}
      </Row>
      <SectionHeader title={t('settings.language')} />
      <Row>
        {LANGUAGES.map((lang) => (
          <Chip key={lang} label={t(`settings.languages.${lang}`)} selected={s.language === lang} onPress={() => s.setLanguage(lang)} />
        ))}
      </Row>
      <SectionHeader title={t('settings.privacy')} />
      <Card>
        <Row>
          <View style={{ flex: 1 }}>
            <Text variant="label">{t('settings.usageReporting')}</Text>
            <Text variant="caption" muted>
              {t('settings.usageReportingHint')}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t('settings.usageReporting')}
            value={s.usageReporting}
            onValueChange={s.setUsageReporting}
            trackColor={{ true: colors.primary }}
          />
        </Row>
      </Card>
      {s.signedIn ? (
        <>
          <SectionHeader title={t('settings.account')} />
          <Button title={t('settings.deleteAccount')} variant="outline" loading={s.deleting} onPress={s.deleteAccount} />
        </>
      ) : null}
    </Screen>
  );
}
