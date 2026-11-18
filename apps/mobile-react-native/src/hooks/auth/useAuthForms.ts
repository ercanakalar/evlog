import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { asAppError, describeError } from '@/store/bases/errorMapping';
import { useLoginMutation, useRegisterMutation } from '@/store/services/authenticationService';
import { signInSchema, signUpSchema, type SignInValues, type SignUpValues } from '@/utils/validation';

/** Credentials are stored by the auth middleware; navigation follows auth state. */
export function useSignInForm() {
  const { t } = useTranslation();
  const [login, { isLoading }] = useLoginMutation();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } });

  const submit = form.handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      await login({ email: values.email.trim().toLowerCase(), password: values.password }).unwrap();
    } catch (error) {
      setServerError(describeError(asAppError(error), t));
    }
  });

  return { control: form.control, submit, isLoading, serverError };
}

export function useSignUpForm() {
  const { t } = useTranslation();
  const [register, { isLoading }] = useRegisterMutation();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: '', email: '', password: '' },
  });

  const submit = form.handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      await register({ ...values, email: values.email.trim().toLowerCase() }).unwrap();
    } catch (error) {
      setServerError(describeError(asAppError(error), t));
    }
  });

  return { control: form.control, submit, isLoading, serverError };
}
