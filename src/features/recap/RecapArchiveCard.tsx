import { LinearGradient } from 'expo-linear-gradient';
import { Lock } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ShareCard } from '@/features/recap/ShareCard';
import { RECAP } from '@/features/recap/recapTheme';
import { periodDisplayName, periodLabel, type RecapKind } from '@/lib/recapPeriod';
import { shareCardFor } from '@/lib/recapShare';
import type { Recap } from '@/lib/recap';

type RecapArchiveCardProps = {
  kind: RecapKind;
  periodKey: string;
  /** Stored payload, when there is one — that is what makes a real card. */
  recap: Recap | null;
  username: string;
  width: number;
  onPress: () => void;
};

/**
 * One recap in the archive, shown as the card you would actually send someone.
 * A list of rows would say the same words; this says what is inside. Periods that
 * have never been opened have no payload to draw yet, so they get a cover plate
 * that reads as unopened rather than as an error.
 */
export function RecapArchiveCard({ kind, periodKey, recap, username, width, onPress }: RecapArchiveCardProps) {
  const label = periodLabel(kind, periodKey);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Play the ${label} recap`}
      className="active:opacity-80"
      style={{ width }}
    >
      {recap ? (
        <MiniShareCard recap={recap} username={username} width={width} />
      ) : (
        <UnopenedPlate kind={kind} periodKey={periodKey} width={width} />
      )}
      <Text className="mt-2 text-[13px] font-semibold text-foreground">{label}</Text>
      <Text className="text-[11px] text-muted-foreground">
        {kind === 'year' ? 'Annual report · 9 pages' : 'Monthly recap · 4 pages'}
      </Text>
    </Pressable>
  );
}

/** The width the share card is composed at. Thumbnails are this, scaled down. */
const DESIGN_WIDTH = 320;

/**
 * The card drawn at full size and scaled, rather than re-laid-out narrow: a
 * thumbnail has to look like the thing it is a thumbnail of, and letting a 9:16
 * card reflow at 160px would give the archive a layout the share sheet never
 * produces.
 */
function MiniShareCard({ recap, username, width }: { recap: Recap; username: string; width: number }) {
  const scale = width / DESIGN_WIDTH;
  const designHeight = Math.round((DESIGN_WIDTH * 16) / 9);

  return (
    <View style={{ width, height: Math.round(designHeight * scale), overflow: 'hidden' }}>
      <View style={{ width: DESIGN_WIDTH, height: designHeight, transform: [{ scale }], transformOrigin: 'top left' }}>
        <ShareCard data={shareCardFor(recap, username)} width={DESIGN_WIDTH} />
      </View>
    </View>
  );
}

function UnopenedPlate({ kind, periodKey, width }: { kind: RecapKind; periodKey: string; width: number }) {
  const isYear = kind === 'year';
  const title = isYear ? periodKey : periodDisplayName('month', periodKey);

  return (
    <LinearGradient
      colors={isYear ? ['#241540', '#100b1a'] : ['#12213f', '#0b0f1a']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width,
        height: Math.round((width * 16) / 9),
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,.1)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        padding: 16,
      }}
    >
      <Text style={{ fontSize: 26, fontWeight: '700', letterSpacing: -1, color: 'rgba(255,255,255,.9)', textAlign: 'center' }}>
        {title}
      </Text>
      <View className="flex-row items-center gap-1.5">
        <Lock size={11} color={RECAP.muted} />
        <Text style={{ fontSize: 10.5, fontWeight: '600', letterSpacing: 0.4, color: RECAP.muted }}>NOT OPENED</Text>
      </View>
    </LinearGradient>
  );
}
