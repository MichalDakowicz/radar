import { CalendarClock, Flame, Sparkles, Users } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar } from '@/features/friends/Avatar';
import { PosterThumb } from '@/features/social/PosterThumb';
import { notificationTone, usesActorAvatar, type NotificationTone } from '@/lib/notificationInbox';
import type { Profile } from '@/types/movie';
import type { AppNotification } from '@/types/notification';

const THUMB = 44;

const TONE_STYLE: Record<NotificationTone, { color: string; className: string }> = {
  social: { color: '#93c5fd', className: 'bg-blue-500/15' },
  release: { color: '#c4b5fd', className: 'bg-violet-500/15' },
  streak: { color: '#fdba74', className: 'bg-orange-500/15' },
  nudge: { color: '#86efac', className: 'bg-green-500/15' },
};

const TONE_ICON = {
  social: Users,
  release: CalendarClock,
  streak: Flame,
  nudge: Sparkles,
} as const;

/**
 * The thumbnail on an inbox row, in preference order: the person who caused it,
 * the title it is about, then the plain tone icon. A row is far easier to
 * recognise by a face or a poster than by a word, so the icon is the last resort
 * rather than the house style.
 */
export function NotificationIcon({ notification, actor }: { notification: AppNotification; actor?: Profile }) {
  const tone = notificationTone(notification.kind);

  if (usesActorAvatar(notification.kind) && actor) {
    return <Avatar profile={actor} size={THUMB} />;
  }

  const { coverUrl, movieTitle } = notification.data;
  if (coverUrl) {
    return <PosterThumb coverUrl={coverUrl} title={movieTitle || notification.title} width={34} radius={5} />;
  }

  const Icon = TONE_ICON[tone];
  const style = TONE_STYLE[tone];
  return (
    <View
      className={`items-center justify-center rounded-full ${style.className}`}
      style={{ width: THUMB, height: THUMB }}
    >
      <Icon size={20} color={style.color} />
    </View>
  );
}
