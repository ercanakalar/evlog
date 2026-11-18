import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import type { AccessibilityRole, StyleProp, TextStyle, ViewStyle } from 'react-native';

export type IconName = ComponentProps<typeof Feather>['name'];

export type TextVariant =
  | 'title' | 'screenTitle' | 'heading' | 'subheading'
  | 'body' | 'bodyMedium' | 'bodyStrong' | 'label' | 'small' | 'smallMedium' | 'caption'
  | 'amountXL' | 'amountL' | 'amount' | 'mono' | 'monoBold' | 'monoSmall';
export type CardTone = 'paper' | 'ink';
export type ButtonVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger' | 'onDark';

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  accessibilityRole?: AccessibilityRole;
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
}
