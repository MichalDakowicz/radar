import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from 'react-native';

import { RECAP } from '@/features/recap/recapTheme';
import type { FaceEntry } from '@/lib/recap';

type FaceAvatarProps = { entry: FaceEntry; size: number; dimmed?: boolean };

// Headshot tints, picked from the name so a face with no photo still gets its
// own colour — same trick as LeaderRow, and the same reason: a recap should
// never show a grey hole where a person is.
const TINTS: [string, string][] = [
  ['#7c3aed', '#ec4899'],
  ['#0f766e', '#22c55e'],
  ['#b45309', '#f59e0b'],
  ['#be123c', '#f43f5e'],
  ['#0e7490', '#22d3ee'],
];

function tintFor(seed: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  return TINTS[hash % TINTS.length];
}

/**
 * A performer's face at any size. Titles added before cast photos were stored
 * carry no image, so the monogram is the normal state for an old library rather
 * than an error case.
 */
export function FaceAvatar({ entry, size, dimmed }: FaceAvatarProps) {
  const ring = { width: size, height: size, borderRadius: 99, borderWidth: 1, borderColor: RECAP.line };

  if (entry.image) {
    return (
      <Image
        source={{ uri: entry.image }}
        style={[ring, { opacity: dimmed ? 0.75 : 1, backgroundColor: RECAP.sheet }]}
        contentFit="cover"
      />
    );
  }

  return (
    <LinearGradient
      colors={tintFor(entry.name)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[ring, { alignItems: 'center', justifyContent: 'center', opacity: dimmed ? 0.75 : 1 }]}
    >
      <Text style={{ fontSize: Math.round(size * 0.34), fontWeight: '700', color: '#fff' }}>{entry.initials}</Text>
    </LinearGradient>
  );
}
