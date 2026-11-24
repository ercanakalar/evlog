import type { ReactNode } from 'react';
import { space } from '@/constants/layout';
import { SpaceBetween } from './Row';
import { Text } from './Text';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <SpaceBetween style={{ marginTop: space.lg, marginBottom: space.xs }}>
      <Text variant="heading">{title}</Text>
      {action}
    </SpaceBetween>
  );
}
