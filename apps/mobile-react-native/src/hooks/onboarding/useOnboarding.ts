import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { INVITE_CODE_PATTERN } from '@/constants/domain';
import { useCreateHomeMutation, useJoinHomeMutation } from '@/store/services/homeService';
import { homeSchema, type HomeValues } from '@/utils/validation';
import { useErrorAlert } from '../common/useErrorAlert';

export function useCreateHomeForm() {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const [createHome, { isLoading }] = useCreateHomeMutation();
  const form = useForm<HomeValues>({
    resolver: zodResolver(homeSchema),
    defaultValues: { city: '', district: '', neighborhood: '', addressLine: '', roomLayout: '2+1', areaM2: '' },
  });

  const submit = form.handleSubmit(async ({ areaM2, neighborhood, ...rest }) => {
    try {
      // The new home appears via the invalidated `getMe`; the navigator switches screens.
      await createHome({
        ...rest,
        neighborhood: neighborhood || undefined,
        areaM2: areaM2 ? Number(areaM2) : undefined,
      }).unwrap();
    } catch (error) {
      showError(t('onboarding.saveFailed'), error);
    }
  });

  return { control: form.control, submit, isLoading };
}

export function useJoinHome(initialCode = '') {
  const { t } = useTranslation();
  const showError = useErrorAlert();
  const [joinHome, { isLoading }] = useJoinHomeMutation();
  const [code, setCode] = useState(initialCode.toUpperCase());
  const valid = INVITE_CODE_PATTERN.test(code.trim().toUpperCase());

  const join = async () => {
    try {
      await joinHome(code).unwrap();
    } catch (error) {
      showError(t('onboarding.joinFailed'), error);
    }
  };

  return { code, setCode, valid, join, isLoading };
}
