import { useTranslation } from 'react-i18next';
import { Card, Chip, Row, Screen, ScreenHeader, Text } from '@/components/ui';
import type { LegalDocument, RootScreenProps } from '@/types/screens/navigation';

const DOCUMENTS: LegalDocument[] = ['privacy', 'terms', 'verification'];

export function LegalScreen({ route, navigation }: RootScreenProps<'Legal'>) {
  const { t } = useTranslation();
  const current = route.params.document;
  return (
    <Screen>
      <ScreenHeader back title={t(`legal.${current}`)} />
      <Row style={{ flexWrap: 'wrap' }}>
        {DOCUMENTS.map((doc) => (
          <Chip key={doc} label={t(`legal.${doc}`)} selected={doc === current} onPress={() => navigation.setParams({ document: doc })} />
        ))}
      </Row>
      <Card>
        <Text>{t(`legal.body.${current}`)}</Text>
      </Card>
    </Screen>
  );
}
