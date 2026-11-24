import { useEffect } from 'react';
import i18n, { resolveLanguage } from '@/i18n';
import { bootstrapApp } from '@/store/actions/bootstrap';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectLanguagePreference } from '@/store/slices/settingsSlice';

/** Loads saved preferences and the session once; keeps i18n in sync with settings. */
export function useAppBootstrap() {
  const dispatch = useAppDispatch();
  const language = useAppSelector(selectLanguagePreference);

  useEffect(() => {
    void dispatch(bootstrapApp());
  }, [dispatch]);

  useEffect(() => {
    void i18n.changeLanguage(resolveLanguage(language));
  }, [language]);
}
