import { useTranslation } from 'react-i18next';
import { Card, Chip, Row, Screen, ScreenHeader, Text } from '@/components/ui';
import { env } from '@/config/env';
import type { LegalDocument, RootScreenProps } from '@/types/screens/navigation';

const DOCUMENTS: LegalDocument[] = ['privacy', 'terms', 'verification'];

export function LegalScreen({ route, navigation }: RootScreenProps<'Legal'>) {
  const { t } = useTranslation();
  // A deep link (legal/<document>) can name anything.
  const current = DOCUMENTS.find((doc) => doc === route.params.document) ?? 'privacy';
  const sections = t(`legal.body.${current}`, { returnObjects: true, ...env.legal });
  return (
    <Screen>
      <ScreenHeader back title={t(`legal.${current}`)} />
      <Row style={{ flexWrap: 'wrap' }}>
        {DOCUMENTS.map((doc) => (
          <Chip key={doc} label={t(`legal.${doc}`)} selected={doc === current} onPress={() => navigation.setParams({ document: doc })} />
        ))}
      </Row>
      <Text variant="caption" muted>
        {t('legal.body.updated')}
      </Text>
      {sections.map((section) => (
        <Card key={section.title}>
          <Text variant="heading">{section.title}</Text>
          <Text>{section.text}</Text>
        </Card>
      ))}
    </Screen>
  );
}
