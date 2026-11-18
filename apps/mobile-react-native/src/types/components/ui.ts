import type Feather from '@expo/vector-icons/Feather';
import type { ComponentProps, ReactNode } from 'react';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';

export type IconName = ComponentProps<typeof Feather>['name'];

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'label' | 'caption';
export type CardTone = 'default' | 'primary' | 'warm' | 'success' | 'muted';
export type BadgeTone = 'neutral' | 'success' | 'danger' | 'ink';
export type ButtonVariant = 'primary' | 'outline' | 'ghost';

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  muted?: boolean;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
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
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export interface IconButtonProps {
  icon: IconName;
  onPress: () => void;
  label: string;
  tone?: 'primary' | 'card' | 'light';
  size?: number;
}

export interface ScreenProps {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Leave room for the floating tab bar. */
  withTabBar?: boolean;
}
