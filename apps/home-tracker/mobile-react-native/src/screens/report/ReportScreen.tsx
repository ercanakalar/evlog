import { useTranslation } from 'react-i18next';
import { Button, Chip, Field, Row, Screen, ScreenHeader, SectionHeader, Text } from '@/components/ui';
import { useReport } from '@/hooks/report/useReport';
import type { ReportReason } from '@/types/api/models';
import type { RootScreenProps } from '@/types/screens/navigation';

const REASONS: ReportReason[] = ['OFFENSIVE', 'PERSONAL_DATA', 'FALSE_INFORMATION', 'SPAM', 'ILLEGAL', 'OTHER'];

export function ReportScreen({ route }: RootScreenProps<'Report'>) {
  const { t } = useTranslation();
  const r = useReport(route.params);
  return (
    <Screen>
      <ScreenHeader back title={t('report.title')} />
      <Text muted>{t(`report.intro.${route.params.targetType}`)}</Text>
      <SectionHeader title={t('report.reasonTitle')} />
      <Row style={{ flexWrap: 'wrap' }}>
        {REASONS.map((reason) => (
          <Chip key={reason} label={t(`report.reason.${reason}`)} selected={r.reason === reason} onPress={() => r.setReason(reason)} />
        ))}
      </Row>
      <Field label={t('report.details')} multiline maxLength={1000} value={r.details} onChangeText={r.setDetails} style={{ minHeight: 100, textAlignVertical: 'top' }} />
      <Button title={t('report.send')} icon="flag" disabled={!r.canSend} loading={r.sending} onPress={r.send} />
    </Screen>
  );
}
