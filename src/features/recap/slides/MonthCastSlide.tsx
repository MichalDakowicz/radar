import { Text, View } from 'react-native';

import { FaceAvatar } from '@/features/recap/parts/FaceAvatar';
import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { MONO, RECAP } from '@/features/recap/recapTheme';
import type { FaceEntry, MonthlyRecap } from '@/lib/recap';

type MonthCastSlideProps = { recap: MonthlyRecap };

/**
 * Three faces, side by side — the month is short enough that a ranked list
 * would mostly be ties, so this shows who was on screen rather than ranking
 * them against each other.
 */
export function MonthCastSlide({ recap }: MonthCastSlideProps) {
  const actors = recap.actors.slice(0, 3);
  const repeat = actors.filter((a) => a.count > 1);
  const month = recap.display.charAt(0) + recap.display.slice(1).toLowerCase();

  return (
    <View className="gap-7">
      <View>
        <View className="mb-3">
          <SlideLabel color={RECAP.muted}>{`THE FACES OF ${recap.display}`}</SlideLabel>
        </View>
        <SlideHeadline size={40}>{repeat.length > 0 ? `You kept\nseeing them.` : `Who you\nwatched.`}</SlideHeadline>
        <Text className="mt-3" style={{ fontSize: 14, lineHeight: 21, color: RECAP.muted }}>
          {repeat.length > 0
            ? `${repeat[0].name} turned up in ${repeat[0].count} of them.`
            : `The billing on everything you finished in ${month}.`}
        </Text>
      </View>

      <View className="flex-row" style={{ gap: 12 }}>
        {actors.map((entry) => (
          <FaceColumn key={entry.name} entry={entry} />
        ))}
      </View>
    </View>
  );
}

function FaceColumn({ entry }: { entry: FaceEntry }) {
  return (
    <View className="flex-1 items-center gap-2.5">
      <FaceAvatar entry={entry} size={86} />
      <Text numberOfLines={2} className="text-center" style={{ fontSize: 13, lineHeight: 16, fontWeight: '600', color: RECAP.ink }}>
        {entry.name}
      </Text>
      <Text style={{ fontFamily: MONO, fontSize: 11, fontWeight: '600', color: RECAP.muted }}>
        {entry.count} {entry.count === 1 ? 'title' : 'titles'}
      </Text>
    </View>
  );
}
