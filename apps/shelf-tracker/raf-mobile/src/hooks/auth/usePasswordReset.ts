import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { asAppError, describeError } from '@/store/bases/errorMapping';
import { useForgotPasswordMutation, useResetPasswordMutation } from '@/store/services/authenticationService';
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  type ForgotPasswordValues,
  type ResetPasswordValues,
} from '@/utils/validation';

/**
 * Asks for the email, then for the emailed code and a new password. The reset
 * signs in; navigation follows the auth state.
 */
export function usePasswordReset(initialEmail: string) {
  const { t, i18n } = useTranslation();
  const [forgot, forgotState] = useForgotPasswordMutation();
  const [reset, resetState] = useResetPasswordMutation();
  const [sentTo, setSentTo] = useState<string>();
  const [error, setError] = useState<string>();
  const emailForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: initialEmail },
  });
  const codeForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', password: '' },
  });

  const run = async (request: () => Promise<unknown>) => {
    setError(undefined);
    try {
      await request();
    } catch (e) {
      setError(describeError(asAppError(e), t));
    }
  };

  return {
    sentTo,
    error,
    emailControl: emailForm.control,
    sendCode: emailForm.handleSubmit(({ email: typed }) =>
      run(async () => {
        const email = typed.trim().toLowerCase();
        await forgot({ email, lang: i18n.language === 'tr' ? 'tr' : 'en' }).unwrap();
        setSentTo(email);
      }),
    ),
    sending: forgotState.isLoading,
    codeControl: codeForm.control,
    submit: codeForm.handleSubmit(({ code, password }) =>
      run(() => reset({ email: sentTo ?? '', code, password }).unwrap()),
    ),
    resetting: resetState.isLoading,
    changeEmail: () => {
      setSentTo(undefined);
      setError(undefined);
    },
  };
}
