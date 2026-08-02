import { Inbox as InboxIcon } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { NavIslands } from '@/components/layout/NavIslands';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { InboxActions } from '@/features/notifications/InboxActions';
import { InboxRequests } from '@/features/notifications/InboxRequests';
import { NotificationRow } from '@/features/notifications/NotificationRow';
import { useInbox } from '@/features/notifications/useInbox';
import { NestedHeader } from '@/features/social/NestedHeader';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';

/**
 * The notification centre. Pending friend requests sit at the top as things to
 * act on; everything else — friends' watching, releases, streak warnings,
 * nudges — is history you can read or dismiss.
 */
export default function InboxScreen() {
  const navBarSpace = useNavBarSpace();
  const { sections, actors, unread, loading, error, open, markAllRead, clearAll, clearing, isEmpty } = useInbox();

  return (
    <View className="flex-1 bg-background">
      <NestedHeader title="Inbox" />

      {loading ? (
        <LoadingState label="Loading your inbox…" />
      ) : error ? (
        <ErrorState message={error instanceof Error ? error.message : 'Failed to load notifications'} />
      ) : (
        <ContentShell fill maxWidth={MAX_W.text}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="gap-5 px-4 pt-4"
            contentContainerStyle={{ paddingBottom: navBarSpace }}
          >
            <InboxRequests />

            {isEmpty ? (
              <EmptyState
                icon={<InboxIcon size={38} color="hsl(0 0% 35%)" />}
                title="Nothing new"
                description="Friend activity, release dates and streak warnings land here. Choose what you get in Settings → Notifications."
              />
            ) : (
              <>
                <InboxActions
                  unread={unread}
                  clearing={clearing}
                  onMarkAllRead={markAllRead}
                  onClearAll={clearAll}
                />

                {sections.map((section) => (
                  <View key={section.bucket} className="gap-2">
                    <Text className="px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {section.label}
                    </Text>
                    {section.items.map((notification) => (
                      <NotificationRow
                        key={notification.id}
                        notification={notification}
                        actor={notification.actorId ? actors.get(notification.actorId) : undefined}
                        onPress={() => open(notification)}
                      />
                    ))}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </ContentShell>
      )}

      {/* Pushed out of the tabs, so the navigator's own bar is gone - the screen
          mounts it itself and Social stays lit while you are down here. */}
      <NavIslands />
    </View>
  );
}
