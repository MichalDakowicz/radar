import { Text, View } from 'react-native';

import { FaceAvatar } from '@/features/recap/parts/FaceAvatar';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { MONO, RECAP } from '@/features/recap/recapTheme';
import type { FaceEntry, YearlyRecap } from '@/lib/recap';

type YearActorsSlideProps = { recap: YearlyRecap };

/**
 * The faces, not a podium: five of them fit as a list where three fit as
 * plinths, and actors repeat far more often than directors do — a year that
 * gives one director three films will hand the same lead five.
 *
 * The leader's row is the big one; the four behind it stay small so the ranking
 * is read in the sizes before the counts are read at all.
 */
export function YearActorsSlide({ recap }: YearActorsSlideProps) {
  const [leader, ...rest] = recap.actors;
  const surname = leader ? leader.name.split(/\s+/).pop() : null;

  return (
    <View className="gap-6">
      <View>
        <View className="mb-3.5">
          <SlideLabel>05 — THE FACES</SlideLabel>
        </View>
        {leader && <SlideHeadline>{`You watched ${surname}\n${recap.actors[0].count} times.`}</SlideHeadline>}
      </View>

      {recap.actors.length > 0 ? (
        <View className="gap-3.5">
          {leader && <LeadRow entry={leader} />}
          {rest.map((entry, index) => (
            <ActorRow key={entry.name} entry={entry} place={index + 2} />
          ))}
        </View>
      ) : (
        <Text style={{ color: RECAP.muted }}>No cast credited on what you finished this year.</Text>
      )}
    </View>
  );
}

function LeadRow({ entry }: { entry: FaceEntry }) {
  return (
    <View className="flex-row items-center gap-3.5">
      <FaceAvatar entry={entry} size={72} />
      <View className="min-w-0 flex-1">
        <Text numberOfLines={2} style={{ fontSize: 19, lineHeight: 23, fontWeight: '700', color: RECAP.ink }}>
          {entry.name}
        </Text>
        <Text className="mt-0.5" style={{ fontFamily: MONO, fontSize: 13, fontWeight: '600', color: RECAP.movieSoft }}>
          {entry.count} {entry.count === 1 ? 'title' : 'titles'}
        </Text>
        <View className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: RECAP.line }}>
          <View className="h-full rounded-full" style={{ width: '100%', backgroundColor: RECAP.movie }} />
        </View>
      </View>
    </View>
  );
}

function ActorRow({ entry, place }: { entry: FaceEntry; place: number }) {
  return (
    <View className="flex-row items-center gap-3">
      <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '600', width: 14, color: RECAP.faint }}>{place}</Text>
      <FaceAvatar entry={entry} size={40} dimmed />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: RECAP.ink, flexShrink: 1 }}>
            {entry.name}
          </Text>
          <Text style={{ fontFamily: MONO, fontSize: 12, fontWeight: '600', color: RECAP.muted }}>{entry.count}</Text>
        </View>
        <View className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: RECAP.line }}>
          <View className="h-full rounded-full" style={{ width: `${entry.ratio * 100}%`, backgroundColor: '#525252' }} />
        </View>
      </View>
    </View>
  );
}
