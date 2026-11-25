import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { useSendReportMutation } from '@/store/services/reportService';
import type { ReportReason, ReportTarget } from '@/types/api/models';
import { useErrorAlert } from '../common/useErrorAlert';

export function useReport(target: { targetType: ReportTarget; targetId: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const showError = useErrorAlert();
  const [sendReport, { isLoading: sending }] = useSendReportMutation();
  const [reason, setReason] = useState<ReportReason>();
  const [details, setDetails] = useState('');

  const send = () => {
    if (!reason) return;
    sendReport({ ...target, reason, details: details.trim() || undefined })
      .unwrap()
      .then(() => {
        Alert.alert(t('report.sent'), t('report.sentBody'));
        navigation.goBack();
      })
      .catch((error: unknown) => showError(t('report.failed'), error));
  };

  return { reason, setReason, details, setDetails, send, sending, canSend: reason !== undefined };
}
