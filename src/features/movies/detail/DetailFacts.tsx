import { useRouter } from 'expo-router';
import { Building2, Calendar, Clock, Star, Users, Wallet } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { GenreIcon } from '@/components/media/GenreIcon';
import { ProgressBorder } from '@/components/ui/ProgressBorder';
import { scoreToProgress } from '@/lib/progressBorder';
import type { CastMember, NamedRef, ProductionCompany } from '@/types/movie';

import { AvailabilityBadges } from './AvailabilityBadges';
import { CastRow } from './CastRow';

const SCORE_COLOR = '#f59e0b';

// The catalogue half of the detail screen: facts that come from TMDB and are
// the same whether or not the title is in the library (doc 12 part 1 unify).
// Owned and not-yet-owned used to render different subsets of this - owned
// titles hid budget/production entirely and buried cast in an edit tab - so it
// all lives here now and both entry points mount the same components.

function Stat({
  icon,
  label,
  value,
  progress,
  progressColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  progress?: number;
  progressColor?: string;
}) {
  return (
    <View className="min-w-[45%] flex-1 gap-1 rounded-xl border border-border bg-secondary p-3">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Text>
      <View className="flex-row items-center gap-2">
        {icon}
        <Text className="font-medium text-foreground">{value}</Text>
      </View>
      {progress != null && <ProgressBorder progress={progress} color={progressColor ?? SCORE_COLOR} />}
    </View>
  );
}

export function DetailStats({
  releaseDate,
  runtime,
  budget,
  voteAverage,
  stacked,
}: {
  releaseDate: string | null;
  runtime: number;
  budget: number;
  voteAverage: number;
  stacked?: boolean;
}) {
  return (
    <View className={stacked ? 'gap-3' : 'flex-row flex-wrap gap-3'}>
      <Stat icon={<Calendar size={16} color="#3b82f6" />} label="Release" value={releaseDate || 'Unknown'} />
      <Stat icon={<Clock size={16} color="#a855f7" />} label="Runtime" value={runtime ? `${runtime}m` : 'N/A'} />
      {budget > 0 && (
        <Stat icon={<Wallet size={16} color="#10b981" />} label="Budget" value={`$${(budget / 1_000_000).toFixed(1)}M`} />
      )}
      {voteAverage > 0 && (
        // The card's own border doubles as the track; the stroke runs as far
        // around it as the score goes, so 7.9/10 closes 79% of the loop.
        <Stat
          icon={<Star size={16} color={SCORE_COLOR} />}
          label="Public score"
          value={`${voteAverage.toFixed(1)} / 10`}
          progress={scoreToProgress(voteAverage)}
        />
      )}
    </View>
  );
}

export function DetailCast({ cast }: { cast: CastMember[] }) {
  if (cast.length === 0) return null;
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Users size={18} color="#ec4899" />
        <Text className="text-lg font-bold text-foreground">Cast</Text>
      </View>
      <CastRow cast={cast} />
    </View>
  );
}

export function DetailProduction({ companies }: { companies: ProductionCompany[] }) {
  const router = useRouter();
  if (companies.length === 0) return null;
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Building2 size={18} color="#06b6d4" />
        <Text className="text-lg font-bold text-foreground">Production</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {companies.map((c) => (
          <Pressable
            key={c.id ?? c.name}
            disabled={!c.id}
            onPress={() => c.id && router.push({ pathname: '/studio/[id]', params: { id: String(c.id) } })}
            className="rounded-full border border-border bg-secondary px-3 py-1.5"
          >
            <Text className="text-sm text-muted-foreground">{c.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function DetailGenres({ genres }: { genres: NamedRef[] }) {
  const router = useRouter();
  if (genres.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold uppercase text-muted-foreground">Genres</Text>
      <View className="flex-row flex-wrap gap-2">
        {genres.map((g) => (
          <Pressable
            key={g.id ?? g.name}
            disabled={!g.id}
            onPress={() => g.id && router.push({ pathname: '/genre/[id]', params: { id: String(g.id) } })}
            className="flex-row items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1.5"
          >
            <GenreIcon genre={g.name} />
            <Text className="text-sm text-foreground">{g.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function DetailAvailability({ availability }: { availability: string[] }) {
  if (availability.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold uppercase text-muted-foreground">Available on</Text>
      <AvailabilityBadges availability={availability} />
    </View>
  );
}
