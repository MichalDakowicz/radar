import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { getServiceStyle } from '@/lib/services';
import { needsSubscription, urgencyLabel, type LeavingTitle } from '@/lib/leaving';

const POSTER_W = 46;

// Urgency is the whole point of the surface, so it is carried by colour as well
// as by the label — but the label always says the same thing in words, because
// colour alone is not readable to everyone.
function urgencyColor(daysLeft: number): string {
  if (daysLeft <= 1) return 'hsl(0 84% 60%)';
  if (daysLeft <= 3) return 'hsl(25 95% 53%)';
  if (daysLeft <= 7) return 'hsl(45 93% 47%)';
  return 'hsl(0 0% 63.9%)';
}

type LeavingRowProps = {
  entry: LeavingTitle;
  onPress: (entry: LeavingTitle) => void;
};

/** One title in the leaving-soon agenda: poster, name, which services drop it,
 *  and how long is left. */
export function LeavingRow({ entry, onPress }: LeavingRowProps) {
  const color = urgencyColor(entry.daysLeft);

  return (
    <Pressable
      onPress={() => onPress(entry)}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-card px-3 py-2"
    >
      {entry.posterUrl ? (
        <Image
          source={{ uri: entry.posterUrl }}
          style={{ width: POSTER_W, height: POSTER_W * 1.5, borderRadius: 6 }}
          contentFit="cover"
          transition={120}
        />
      ) : (
        <View
          style={{ width: POSTER_W, height: POSTER_W * 1.5, borderRadius: 6 }}
          className="bg-secondary"
        />
      )}

      <View className="flex-1">
        <Text className="font-semibold text-foreground" numberOfLines={1}>
          {entry.title}
        </Text>
        {!!entry.releaseYear && (
          <Text className="text-xs text-muted-foreground">{entry.releaseYear}</Text>
        )}
        <View className="mt-1 flex-row flex-wrap items-center gap-1">
          {entry.services.map((service) => {
            const style = getServiceStyle(service);
            // Filled means you already pay for it and can watch it tonight;
            // outlined means the title is going but watching it would mean
            // taking out a subscription. The distinction has to survive being
            // glanced at, which is why it is fill and not a shade of the brand.
            const have = entry.ownedServices.includes(service);
            return (
              <View
                key={service}
                className="rounded border px-1.5 py-0.5"
                style={{
                  backgroundColor: have ? style.color : 'transparent',
                  borderColor: style.color,
                }}
              >
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: have ? style.textColor : style.color }}
                >
                  {service}
                </Text>
              </View>
            );
          })}
          {needsSubscription(entry) && (
            <Text className="text-[10px] text-muted-foreground">· needs a sub</Text>
          )}
        </View>
      </View>

      <View className="rounded-full px-2 py-1" style={{ backgroundColor: `${color}22` }}>
        <Text className="text-xs font-semibold" style={{ color }}>
          {urgencyLabel(entry.daysLeft)}
        </Text>
      </View>
    </Pressable>
  );
}
