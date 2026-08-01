import { Image } from 'expo-image';
import { Film } from 'lucide-react-native';
import { Text, View } from 'react-native';

type PosterThumbProps = {
  coverUrl: string | null;
  title: string;
  width: number;
  /** Defaults to the 2:3 poster ratio. */
  height?: number;
  radius?: number;
};

/**
 * Small poster used across the Social screens' rows and rails. A title with no
 * artwork gets its initial rather than an empty box, so a coverless row still
 * has something to aim a tap at.
 */
export function PosterThumb({ coverUrl, title, width, height, radius = 6 }: PosterThumbProps) {
  const box = { width, height: height ?? Math.round(width * 1.5), borderRadius: radius };

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
    <View className="items-center justify-center bg-secondary" style={box}>
      {width >= 40 ? (
        <Text className="font-bold text-muted-foreground" style={{ fontSize: width * 0.34 }}>
          {title.slice(0, 1).toUpperCase()}
        </Text>
      ) : (
        <Film size={Math.round(width * 0.5)} color="hsl(0 0% 45%)" />
      )}
    </View>
  );
}
