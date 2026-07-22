import { Image } from 'expo-image';
import { Tags, User } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

type BrowseSearchResultTileProps = {
  title: string;
  subtitle: string;
  coverUrl: string | null;
  kind: 'person' | 'genre';
  onPress: () => void;
};

// Person/genre search results aren't movies - MovieCard's contract doesn't
// fit them, so this stays a small dedicated tile instead of stretching it
// (doc 03 Browse `SearchResultsGrid` is explicitly its own component).
export function BrowseSearchResultTile({ title, subtitle, coverUrl, kind, onPress }: BrowseSearchResultTileProps) {
  return (
    <Pressable onPress={onPress} className="aspect-[2/3] overflow-hidden rounded-md bg-neutral-900">
      {coverUrl ? (
        <Image source={{ uri: coverUrl }} style={{ flex: 1 }} contentFit="cover" />
      ) : (
        <View className="flex-1 items-center justify-center bg-neutral-800">
          {kind === 'genre' ? <Tags size={32} color="#a78bfa" /> : <User size={32} color="#737373" />}
        </View>
      )}
      <View className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1">
        <Text numberOfLines={1} className="text-[11px] font-semibold text-white">
          {title}
        </Text>
        <Text numberOfLines={1} className="text-[10px] text-neutral-300">
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
