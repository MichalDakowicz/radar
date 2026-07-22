import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Film, User } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { goBackOrHome } from '@/lib/utils';

type PersonHeroProps = {
  name: string;
  profileUrl: string | null;
  knownForDepartment: string | null;
  filmCount: number;
  birthday?: string | null;
  placeOfBirth?: string | null;
  biography?: string;
};

// Shared bio header for Director/Actor pages (doc 03 Person/Genre pages) -
// blurred-profile backdrop + name/department/film-count, mirrors DetailHero's
// back-button treatment. Passed as MediaGrid's ListHeaderComponent so the bio
// and the filmography grid share one scroll (no nested same-orientation lists).
export function PersonHero({ name, profileUrl, knownForDepartment, filmCount, birthday, placeOfBirth, biography }: PersonHeroProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View>
      <View className="relative">
        <View className="h-64 w-full overflow-hidden bg-neutral-900">
          {!!profileUrl && (
            <Image source={{ uri: profileUrl }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={50} />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']} style={StyleSheet.absoluteFill} />
        </View>

        <Pressable
          onPress={() => goBackOrHome(router)}
          className="absolute left-4 z-10 rounded-full bg-black/50 p-2.5"
          style={{ top: insets.top + 8 }}
        >
          <ArrowLeft size={22} color="#fff" />
        </Pressable>

        <View className="-mt-28 flex-row gap-4 px-4">
          <View className="aspect-[2/3] w-28 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-800 shadow-2xl">
            {profileUrl ? (
              <Image source={{ uri: profileUrl }} style={{ flex: 1 }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <User size={28} color="#525252" />
              </View>
            )}
          </View>

          <View className="flex-1 justify-end gap-1.5 pb-1">
            <Text className="text-2xl font-bold leading-tight text-white">{name}</Text>
            <View className="flex-row items-center gap-1.5">
              <Film size={14} color="#3b82f6" />
              <Text className="text-sm text-neutral-300">
                {filmCount} {filmCount === 1 ? 'film' : 'films'}
              </Text>
            </View>
            {!!knownForDepartment && <Text className="text-sm text-neutral-400">Known for {knownForDepartment}</Text>}
          </View>
        </View>
      </View>

      <View className="gap-4 px-4 pt-6">
        {(!!birthday || !!placeOfBirth) && (
          <View className="flex-row gap-3">
            {!!birthday && (
              <View className="flex-1 gap-1 rounded-xl border border-border bg-secondary p-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Born</Text>
                <Text className="font-medium text-foreground">
                  {new Date(birthday).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            )}
            {!!placeOfBirth && (
              <View className="flex-1 gap-1 rounded-xl border border-border bg-secondary p-3">
                <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Birthplace</Text>
                <Text className="font-medium text-foreground">{placeOfBirth}</Text>
              </View>
            )}
          </View>
        )}

        {!!biography && (
          <View className="gap-2">
            <Text className="text-lg font-bold text-foreground">Biography</Text>
            <Text className="leading-relaxed text-muted-foreground">{biography}</Text>
          </View>
        )}

        <Text className="text-lg font-bold text-foreground">Films</Text>
      </View>
    </View>
  );
}
