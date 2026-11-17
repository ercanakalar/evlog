import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Alert, Share, View } from 'react-native';
import { Badge, Button, Card, Chip, ErrorView, IconButton, Loading, Row, Screen, T } from '@/components/ui';
import { authedImage } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { longDate } from '@/lib/format';
import { useCurrentHome } from '@/lib/home-context';
import { useDashboard, useInviteTenant } from '@/lib/queries';
import { radius } from '@/theme/colors';
import { useTheme } from '@/theme/use-theme';

export default function HomeScreen() {
  const { home, role, options, select } = useCurrentHome();
  const { colors } = useTheme();
  const { signOut } = useAuth();
  const dashboard = useDashboard(home.id);
  const invite = useInviteTenant(home.id);
  const roles = options.filter((o) => o.home.id === home.id);

  if (dashboard.isPending) return <Loading />;
  if (dashboard.isError) return <ErrorView error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  const d = dashboard.data;
  const record = d.conditionRecord;

  const inviteTenant = () =>
    invite.mutate(new Date().toISOString().slice(0, 10), {
      onSuccess: ({ inviteCode }) =>
        void Share.share({ message: `Join our home on Evlog with code ${inviteCode}` }),
      onError: (error) => Alert.alert('Could not create invite', error.message),
    });

  return (
    <Screen refreshing={dashboard.isRefetching} onRefresh={() => void dashboard.refetch()}>
      <Row style={{ justifyContent: 'space-between', marginTop: 12 }}>
        <T variant="caption" muted>
          {home.district}, {home.city} · {home.roomLayout}
        </T>
        <IconButton icon="log-out" tone="card" label="Sign out" onPress={() => void signOut()} />
      </Row>
      <T variant="title">My home</T>
      <Row>
        {(roles.length > 1 ? roles : [{ home, role }]).map((o) => (
          <Chip
            key={o.role}
            label={o.role === 'OWNER' ? 'Owner' : 'Tenant'}
            selected={o.role === role}
            onPress={() => select(o.home.id, o.role)}
          />
        ))}
      </Row>

      <Card tone="primary">
        <T variant="caption" color={colors.onPrimary}>
          Home score
        </T>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <T variant="display" color={colors.onPrimary}>
              {d.score.score?.toFixed(1) ?? '—'}
            </T>
            <T variant="caption" color={colors.onPrimary}>
              {d.score.ratingCount === 0
                ? 'No verified ratings yet'
                : `${d.score.ratingCount} tenant${d.score.ratingCount > 1 ? 's' : ''} · all receipt-verified`}
            </T>
          </View>
          <IconButton icon="arrow-up-right" tone="light" label="Open ratings" onPress={() => router.push('/ratings')} />
        </Row>
      </Card>

      <Card onPress={() => router.push('/record')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="heading">Condition record</T>
          {record ? (
            <Badge
              label={record.status === 'CONFIRMED' ? 'Confirmed' : record.status === 'LOCKED' ? 'Awaiting confirmation' : 'In progress'}
              tone={record.status === 'CONFIRMED' ? 'success' : 'neutral'}
              icon={record.status === 'CONFIRMED' ? 'check' : undefined}
            />
          ) : null}
        </Row>
        {record ? (
          <>
            <Row>
              {record.previewPhotoIds.map((id) => (
                <Image
                  key={id}
                  source={authedImage(`/condition-photos/${id}/file`)}
                  style={{ flex: 1, height: 56, borderRadius: radius.sm, backgroundColor: colors.cardMuted }}
                  contentFit="cover"
                />
              ))}
              {record.photoCount > 3 ? (
                <View style={{ flex: 1, height: 56, borderRadius: radius.sm, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <T variant="label" color={colors.onInk}>
                    +{record.photoCount - 3}
                  </T>
                </View>
              ) : null}
            </Row>
            <T variant="caption" muted>
              {record.type === 'MOVE_IN' ? 'Move-in' : record.type === 'MOVE_OUT' ? 'Move-out' : 'Check'} · {longDate(record.startedAt)}
            </T>
          </>
        ) : (
          <T muted>No photos yet. Start a move-in record.</T>
        )}
      </Card>

      <Row style={{ alignItems: 'stretch' }}>
        {role === 'OWNER' ? (
          <Tile icon="link" title="Listing" subtitle={`${d.listings.count} linked`} onPress={() => router.push('/listing')} />
        ) : null}
        <Tile icon="shopping-bag" title="Kitchen" subtitle={`${d.kitchen.lowCount} low`} onPress={() => router.push('/kitchen')} />
        <Tile
          icon="tool"
          title="Upkeep"
          subtitle={d.upkeep ? `${d.upkeep.appliance.name} ${d.upkeep.daysLeft}d` : 'All good'}
          warm={!!d.upkeep && d.upkeep.daysLeft <= 14}
          onPress={() => router.push('/upkeep')}
        />
      </Row>

      {role === 'OWNER' && !d.activeTenancy ? (
        <Button title="Invite a tenant" variant="outline" loading={invite.isPending} onPress={inviteTenant} />
      ) : null}
    </Screen>
  );
}

function Tile({
  icon,
  title,
  subtitle,
  warm,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  subtitle: string;
  warm?: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <Card tone={warm ? 'warm' : 'default'} onPress={onPress} style={{ minHeight: 96, justifyContent: 'space-between' }}>
        <Feather name={icon} size={18} color={warm ? colors.warmText : colors.text} />
        <View>
          <T variant="label">{title}</T>
          <T variant="caption" color={warm ? colors.warmText : colors.textMuted} numberOfLines={1}>
            {subtitle}
          </T>
        </View>
      </Card>
    </View>
  );
}
