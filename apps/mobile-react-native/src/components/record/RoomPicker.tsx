import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Chip } from '@/components/ui';
import { ROOMS } from '@/constants/domain';
import type { Room } from '@/types/api/models';

export function RoomPicker({
  value,
  counts,
  onChange,
}: {
  value: Room;
  counts: Partial<Record<Room, number>>;
  onChange: (room: Room) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {ROOMS.map((room) => (
        <Chip
          key={room}
          label={counts[room] ? `${t(`rooms.${room}`)} · ${counts[room]}` : t(`rooms.${room}`)}
          selected={room === value}
          onPress={() => onChange(room)}
        />
      ))}
    </View>
  );
}
