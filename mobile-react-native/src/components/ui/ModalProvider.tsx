import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { space } from '@/constants/layout';
import { useTheme } from '@/theme';
import type { ModalAction } from '@/types/components/ui';
import { AppModal, ModalChoice } from './AppModal';
import { Field } from './Field';
import { Text } from './Text';

interface Choice {
  label: string;
  selected?: boolean;
  destructive?: boolean;
  onPress: () => void;
}

interface PromptOptions {
  title: string;
  message?: string;
  label: string;
  initial?: string;
  placeholder?: string;
  submitLabel: string;
  /** Return false (or throw) to keep the modal open, e.g. after a server error. */
  onSubmit: (value: string) => unknown;
}

interface ModalRequest {
  title?: string;
  message?: string;
  actions?: ModalAction[];
  choices?: Choice[];
  prompt?: PromptOptions;
}

export interface ModalApi {
  /** An information or error message with one "OK". */
  alert: (title: string, message?: string) => void;
  /** "Delete this receipt?" with Cancel and a (destructive) confirm button. */
  confirm: (options: {
    title: string;
    message?: string;
    confirmLabel: string;
    destructive?: boolean;
    onConfirm: () => unknown;
  }) => void;
  /** A list of choices (pickers, option menus). Choosing closes the modal. */
  choose: (options: { title: string; message?: string; choices: Choice[] }) => void;
  /** A single text field with Cancel and a submit button (renaming). */
  prompt: (options: PromptOptions) => void;
  close: () => void;
}

const ModalContext = createContext<ModalApi | null>(null);

/** Hosts the one app-wide modal; screens and hooks open it with `useModal()`. */
export function ModalProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [request, setRequest] = useState<ModalRequest | null>(null);
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string>();
  // Bumped on every open, so an action that opened another modal (an error,
  // a follow-up question) does not close it when the action finishes.
  const generation = useRef(0);

  const open = useCallback((next: ModalRequest) => {
    generation.current += 1;
    setRequest(next);
    setValue(next.prompt?.initial ?? '');
    setError(undefined);
    setVisible(true);
  }, []);
  const close = useCallback(() => setVisible(false), []);

  const api = useMemo<ModalApi>(
    () => ({
      close,
      alert: (title, message) => open({ title, message, actions: [{ label: t('common.ok') }] }),
      confirm: ({ title, message, confirmLabel, destructive, onConfirm }) =>
        open({
          title,
          message,
          actions: [
            { label: confirmLabel, variant: destructive ? 'dangerFilled' : 'primary', onPress: onConfirm },
            { label: t('common.cancel'), variant: 'ghost' },
          ],
        }),
      choose: ({ title, message, choices }) =>
        open({ title, message, choices, actions: [{ label: t('common.cancel'), variant: 'ghost' }] }),
      prompt: (prompt) => open({ title: prompt.title, message: prompt.message, prompt }),
    }),
    [close, open, t],
  );

  const keepIfReplaced = (action: ModalAction): ModalAction =>
    action.onPress
      ? {
          ...action,
          onPress: async () => {
            const before = generation.current;
            const result = await action.onPress?.();
            return generation.current === before ? result : false;
          },
        }
      : action;

  const prompt = request?.prompt;
  const rawActions: ModalAction[] = prompt
    ? [
        {
          label: prompt.submitLabel,
          disabled: !value.trim(),
          onPress: async () => {
            setError(undefined);
            try {
              return await prompt.onSubmit(value.trim());
            } catch {
              setError(t('common.somethingWrong'));
              return false;
            }
          },
        },
        { label: t('common.cancel'), variant: 'ghost' },
      ]
    : (request?.actions ?? []);
  const actions = rawActions.map(keepIfReplaced);

  return (
    <ModalContext value={api}>
      {children}
      <AppModal
        visible={visible}
        onClose={close}
        title={request?.title}
        message={request?.message}
        actions={actions}>
        {request?.choices ? (
          <View style={{ gap: space.sm }}>
            {request.choices.map((choice) => (
              <ModalChoice
                key={choice.label}
                {...choice}
                onPress={() => {
                  close();
                  choice.onPress();
                }}
              />
            ))}
          </View>
        ) : null}
        {prompt ? <PromptField prompt={prompt} value={value} onChange={setValue} error={error} /> : null}
      </AppModal>
    </ModalContext>
  );
}

function PromptField({
  prompt,
  value,
  onChange,
  error,
}: {
  prompt: PromptOptions;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Field label={prompt.label} value={value} onChangeText={onChange} placeholder={prompt.placeholder} autoFocus />
      {error ? (
        <Text variant="small" color={colors.urgentText} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function useModal(): ModalApi {
  const api = use(ModalContext);
  if (!api) throw new Error('useModal must be used inside ModalProvider');
  return api;
}
