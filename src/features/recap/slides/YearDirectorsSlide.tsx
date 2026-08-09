import { Text, View } from 'react-native';

import { SlideHeadline } from '@/features/recap/parts/SlideHeadline';
import { SlideLabel } from '@/features/recap/parts/SlideLabel';
import { RECAP } from '@/features/recap/recapTheme';
import { plinthHeight, type PodiumEntry, type YearlyRecap } from '@/lib/recap';

type YearDirectorsSlideProps = { recap: YearlyRecap };

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];

function countWord(n: number): string {
  return WORDS[n] ?? String(n);
}

const PLINTH: Record<1 | 2 | 3, string> = { 1: RECAP.movie, 2: '#525252', 3: '#404040' };

/**
 * The podium (design 1d, first layout) instead of a five-row list: three winners
 * ranked, read in half a second.
 *
 * Plinth heights are the counts, to scale, with nothing rounded up to look
 * better — a director on 2 films against one on 9 gets a plinth a fifth as tall.
 * The count and the name sit *above* the plinth so a short bar never clips them.
 */
export function YearDirectorsSlide({ recap }: YearDirectorsSlideProps) {
  const leader = recap.directors.find((d) => d.place === 1);
  const surname = leader ? leader.name.split(/\s+/).pop() : null;

  return (
    <View className="gap-6">
      <View>
        <View className="mb-3.5">
          <SlideLabel>04 — THE DIRECTORS</SlideLabel>
        </View>
        {leader && <SlideHeadline>{`${capitalise(countWord(leader.count))} titles.\nOne ${surname}.`}</SlideHeadline>}
      </View>

      {recap.directors.length > 0 ? (
        <View className="flex-row items-end" style={{ gap: 10 }}>
          {recap.directors.map((entry) => (
            <PodiumColumn key={entry.name} entry={entry} />
          ))}
        </View>
      ) : (
        <Text style={{ color: RECAP.muted }}>No directors credited on what you finished this year.</Text>
      )}
    </View>
  );
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function PodiumColumn({ entry }: { entry: PodiumEntry }) {
  const first = entry.place === 1;
  return (
    <View className="justify-end gap-2" style={{ flex: first ? 1.3 : 1 }}>
      <Text
        numberOfLines={1}
        style={{
          fontSize: first ? 40 : 22,
          fontWeight: '700',
          letterSpacing: first ? -1.2 : -0.4,
          color: RECAP.ink,
        }}
      >
        {entry.count}
      </Text>
      <Text
        numberOfLines={2}
        style={{ fontSize: first ? 15 : 12, lineHeight: first ? 18 : 15, fontWeight: first ? '700' : '600', color: first ? RECAP.ink : RECAP.muted }}
      >
        {entry.name}
      </Text>
      <View style={{ height: plinthHeight(entry.ratio), borderRadius: 8, backgroundColor: PLINTH[entry.place] }} />
    </View>
  );
}
