import Feather from '@expo/vector-icons/Feather';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Card, Row, Text } from '@/components/ui';
import { useTheme } from '@/theme';

export function VerificationBanner({
  verified,
  onScanRent,
  scanning,
}: {
  verified: boolean;
  onScanRent: () => void;
  scanning: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <Card tone={verified ? 'success' : 'warm'}>
      <Row>
        <Feather
          name={verified ? 'check-circle' : 'alert-circle'}
          size={26}
          color={verified ? colors.successText : colors.warmText}
        />
        <View style={{ flex: 1 }}>
          <Text variant="label">{verified ? t('ratings.verified') : t('ratings.notVerified')}</Text>
          <Text variant="caption" muted>
            {verified ? t('ratings.verifiedBody') : t('ratings.notVerifiedBody')}
          </Text>
        </View>
      </Row>
      {!verified ? <Button title={t('ratings.scanRent')} icon="camera" loading={scanning} onPress={onScanRent} /> : null}
    </Card>
  );
}
