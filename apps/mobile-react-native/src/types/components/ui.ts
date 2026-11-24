import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import type { AccessibilityRole, StyleProp, TextStyle, ViewStyle } from 'react-native';

export type IconName = ComponentProps<typeof Feather>['name'];

export type TextVariant =
  | 'display' | 'title' | 'screenTitle' | 'heading' | 'subheading'
  | 'body' | 'bodyMedium' | 'bodyStrong' | 'label' | 'small' | 'smallMedium' | 'caption'
  | 'amountXL' | 'amountL' | 'amount' | 'mono' | 'monoBold' | 'monoSmall';
/** `paper` is the default slip; the soft tones mark state (verified, needs attention). */
export type CardTone = 'paper' | 'ink' | 'accent' | 'muted' | 'success' | 'warm';
export type BadgeTone = 'neutral' | 'success' | 'danger' | 'ink' | 'accent';
export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'dangerFilled' | 'onDark';

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: AccessibilityRole;
  accessibilityLabel?: string;
}

export interface CardProps {
  children: ReactNode;
  tone?: CardTone;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  /** Shown after the title, e.g. the receipt total on "Save receipt". */
  trailing?: ReactNode;
  /** Icon before the title. */
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  /** 46 pt instead of 52 pt. */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
  background?: string;
  /** Preset colours; `color`/`background` override them. */
  tone?: 'plain' | 'card' | 'ink' | 'accent';
  size?: number;
  iconSize?: number;
  selected?: boolean;
}

export interface ScreenProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  gap?: number;
  /** Extra bottom padding so the last row clears a floating action. */
  bottomInset?: number;
}

export type ModalPresentation = 'sheet' | 'fullscreen';

export interface ModalAction {
  label: string;
  /** Defaults to `primary`. */
  variant?: ButtonVariant;
  disabled?: boolean;
  /** May be async; the button shows a spinner. Return false to keep the modal open. No handler = just close. */
  onPress?: () => unknown;
}
