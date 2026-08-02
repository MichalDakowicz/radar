import { BellOff, Library, Users, X } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useNotificationPermission } from '@/features/notifications/useNotificationPermission';
import { useUserSettings } from '@/hooks/useUserSettings';
import { supportsNotifications } from '@/lib/notificationSetup';
import type { FriendActivityScope } from '@/lib/userSettings';

import { NotificationToggle } from './NotificationToggle';
import { QuietHoursControl } from './QuietHoursControl';
import { Segmented } from './Segmented';
import { SettingLabel } from './SettingsSection';

const MUTED = 'hsl(0 0% 63.9%)';

const SCOPES: { value: FriendActivityScope; label: string; icon: React.ReactNode }[] = [
  { value: 'none', label: 'None', icon: <X size={20} color={MUTED} /> },
  { value: 'collection', label: 'My titles', icon: <Library size={20} color={MUTED} /> },
  { value: 'all', label: 'Everything', icon: <Users size={20} color={MUTED} /> },
];

const LEAD_DAYS = [0, 1, 3, 7];

const SCOPE_HINT: Record<FriendActivityScope, string> = {
  none: 'Nothing from friends unless they add you or react to you',
  collection: 'Only when a friend watches something already in your library',
  all: 'Every rating, finish and watchlist add from your friends',
};

/**
 * Everything that decides whether a notification reaches you. The switches write
 * to user_settings, which is where the triggers and pg_cron generators in
 * supabase/notifications.sql read them — so turning one off stops the row being
 * written at all, rather than hiding it after the fact.
 */
export function NotificationsControl() {
  const { user } = useAuth();
  const { settings, updateSettings } = useUserSettings();
  const { granted, request } = useNotificationPermission(user?.id);

  const off = !settings.notifyEnabled;

  return (
    <View className="gap-6">
      {supportsNotifications && granted === false && (
        <Pressable
          onPress={() => void request()}
          accessibilityRole="button"
          className="flex-row items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 active:opacity-70"
        >
          <BellOff size={18} color="#fcd34d" />
          <Text className="flex-1 text-[12.5px] leading-[18px] text-amber-100/90">
            Android is blocking Radar&apos;s notifications. Everything below still lands in your inbox — tap to allow
            banners.
          </Text>
        </Pressable>
      )}

      <NotificationToggle
        title="Notifications"
        description="The master switch. Off means nothing is recorded, so turning it back on will not dump a backlog"
        value={settings.notifyEnabled}
        onChange={(notifyEnabled) => void updateSettings({ notifyEnabled })}
      />

      <View className="gap-3" style={{ opacity: off ? 0.45 : 1 }}>
        <SettingLabel title="Friend activity" description={SCOPE_HINT[settings.notifyFriendActivity]} />
        <Segmented
          options={SCOPES}
          value={settings.notifyFriendActivity}
          disabled={off}
          onChange={(notifyFriendActivity) => void updateSettings({ notifyFriendActivity })}
        />
      </View>

      <NotificationToggle
        title="Friend requests"
        description="When someone adds you, and when someone accepts"
        value={settings.notifyFriendRequests}
        disabled={off}
        onChange={(notifyFriendRequests) => void updateSettings({ notifyFriendRequests })}
      />

      <NotificationToggle
        title="Reactions and comments"
        description="When a friend reacts to or comments on something you logged"
        value={settings.notifySocial}
        disabled={off}
        onChange={(notifySocial) => void updateSettings({ notifySocial })}
      />

      <NotificationToggle
        title="Releases"
        description="The morning something on your watchlist comes out"
        value={settings.notifyReleases}
        disabled={off}
        onChange={(notifyReleases) => void updateSettings({ notifyReleases })}
      />

      {settings.notifyReleases && (
        <View className="gap-2" style={{ opacity: off ? 0.45 : 1 }}>
          <Text className="text-xs text-muted-foreground">Extra heads-up before release day</Text>
          <Segmented
            columns={4}
            disabled={off}
            options={LEAD_DAYS.map((days) => ({
              value: String(days) as `${number}`,
              label: days === 0 ? 'None' : `${days}d`,
            }))}
            value={String(settings.notifyReleaseLeadDays) as `${number}`}
            onChange={(value) => void updateSettings({ notifyReleaseLeadDays: Number(value) })}
          />
        </View>
      )}

      <NotificationToggle
        title="Streak warnings"
        description="At 8pm, when a running streak has nothing logged against it yet"
        value={settings.notifyStreaks}
        disabled={off}
        onChange={(notifyStreaks) => void updateSettings({ notifyStreaks })}
      />

      <NotificationToggle
        title="Suggestions"
        description="At most one a week, after three quiet days, with something to pick up"
        value={settings.notifyNudges}
        disabled={off}
        onChange={(notifyNudges) => void updateSettings({ notifyNudges })}
      />

      <QuietHoursControl disabled={off} />
    </View>
  );
}
