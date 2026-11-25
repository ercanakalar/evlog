import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { asAppError, describeError } from '@/store/bases/errorMapping';
import { useGoogleMutation, useLoginMutation, useRegisterMutation } from '@/store/services/authenticationService';
import { signInSchema, signUpSchema, type SignInValues } from '@/utils/validation';

export type AuthMode = 'signup' | 'login';

/**
 * One form for both tabs of the sign-in screen. Sign-up only asks for email
 * and password (the API names the account after the email until it is
 * changed). Credentials are stored by the auth middleware; navigation
 * follows the auth state.
 */
export function useAuthForm() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<AuthMode>('signup');
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const [google, googleState] = useGoogleMutation();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<SignInValues>({
    resolver: zodResolver(mode === 'signup' ? signUpSchema : signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setServerError(undefined);
    const credentials = { email: values.email.trim().toLowerCase(), password: values.password };
    try {
      await (mode === 'signup' ? register(credentials) : login(credentials)).unwrap();
    } catch (error) {
      setServerError(describeError(asAppError(error), t));
    }
  });

  const signInWithGoogle = async (idToken: string) => {
    setServerError(undefined);
    try {
      await google({ idToken }).unwrap();
    } catch (error) {
      setServerError(describeError(asAppError(error), t));
    }
  };

  return {
    mode,
    setMode: (next: AuthMode) => {
      setMode(next);
      setServerError(undefined);
      form.clearErrors();
    },
    control: form.control,
    submit,
    isLoading: loginState.isLoading || registerState.isLoading,
    googleLoading: googleState.isLoading,
    signInWithGoogle,
    setServerError,
    serverError,
    email: () => form.getValues('email').trim(),
  };
}
