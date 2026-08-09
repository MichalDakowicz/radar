import { Heart } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { LeaderRow } from '@/features/recap/parts/LeaderRow';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import { ordinalWord, type MonthlyRecap } from '@/lib/recap';

type MonthFriendsSlideProps = { recap: MonthlyRecap };

/**
 * Where you landed. Shows the top three plus your own row when you are not in
 * it, so the slide always answers "and me?" without scrolling.
 */
export function MonthFriendsSlide({ recap }: MonthFriendsSlideProps) {
  const rows = recap.leaderboard;
  const place = rows.findIndex((row) => row.isYou) + 1;
  const you = rows[place - 1];
  const leader = rows[0];
  const visible = rows.slice(0, 3);
  const gap = leader && you ? leader.hours - you.hours : 0;

  return (
    <View className="gap-5">
      <View>
        <View className="mb-3">
          <SlideLabel color={RECAP.muted}>{`AMONG YOUR ${rows.length - 1} FRIENDS`}</SlideLabel>
        </View>
        <SlideHeadline size={46}>{place === 1 ? 'You came\nfirst.' : `You came\n${ordinalWord(place)}.`}</SlideHeadline>
        <Text className="mt-3" style={{ fontSize: 14, lineHeight: 21, color: RECAP.muted }}>
          {place === 1
            ? 'Nobody watched more than you this month. Make of that what you will.'
            : `${leader?.name} watched ${gap} more ${gap === 1 ? 'hour' : 'hours'} than you.`}
        </Text>
      </View>

      <View className="gap-3">
        {visible.map((row, i) => (
          <LeaderRow key={`${row.name}-${i}`} row={row} place={i + 1} />
        ))}
        {place > 3 && you && <LeaderRow row={you} place={place} />}

        {recap.sharedTitle && (
          <View className="mt-1.5 flex-row items-center gap-2.5 pt-3.5" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.1)' }}>
            <Heart size={15} color="#ec4899" strokeWidth={2} />
            <Text style={{ fontSize: 12.5, lineHeight: 18, color: RECAP.muted }}>
              You all watched <Text style={{ color: RECAP.ink, fontWeight: '600' }}>{recap.sharedTitle}</Text> this month.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
