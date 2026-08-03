import { Image } from 'expo-image';
import { Text, View } from 'react-native';

import { RECAP } from '@/features/recap/recapTheme';

type RecapPosterProps = {
  coverUrl: string | null;
  title: string;
  width: number;
  radius?: number;
};

/**
 * A 2:3 poster plate on the recap's own dark canvas. Separate from
 * social/PosterThumb because that one falls back to the themed `bg-secondary` —
 * inside the player the fallback has to stay dark in light mode too, or a
 * coverless title turns into a grey hole in the middle of the story.
 */
export function RecapPoster({ coverUrl, title, width, radius = 8 }: RecapPosterProps) {
  const box = { width, height: Math.round(width * 1.5), borderRadius: radius };

  if (coverUrl) {
    return (
      <Image
        source={{ uri: coverUrl }}
        style={box}
        contentFit="cover"
        transition={150}
        accessibilityLabel={`${title} poster`}
      />
    );
  }

  return (
    <View
      style={{ ...box, backgroundColor: '#171717', borderWidth: 1, borderColor: RECAP.line, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ fontSize: Math.max(11, width * 0.32), fontWeight: '700', color: RECAP.faint }}>
        {title.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}
