import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { urgency, type LeavingTitle } from '@/lib/leaving';
import { getServiceStyle, onDarkColor } from '@/lib/services';

// A poster tile, not a row. The list version gave one title a full screen-width
// band and turned 177 of them into a scroll with no end; three posters to a row
// is the density this page needs to be scannable.

type LeavingCardProps = {
  entry: LeavingTitle;
  width: number;
  onPress: (entry: LeavingTitle) => void;
};

export function LeavingCard({ entry, width, onPress }: LeavingCardProps) {
  const { label, bg, fg } = urgency(entry.daysLeft);
  const height = Math.round(width * 1.5);
  // Two is all that fits legibly at this size; the rest are on the detail page.
  const services = entry.services.slice(0, 2);
  const overflow = entry.services.length - services.length;

  return (
    <Pressable onPress={() => onPress(entry)} style={{ width }} className="gap-1.5">
      <View style={{ width, height }} className="overflow-hidden rounded-xl bg-secondary">
        {!!entry.posterUrl && (
          <Image
            source={{ uri: entry.posterUrl }}
            style={{ width, height }}
            contentFit="cover"
            transition={120}
          />
        )}

        {/* Countdown, top-left. Solid fill rather than a tint: it sits on top of
            artwork of unknown brightness, and a translucent badge is unreadable
            over half the posters in any given month. */}
        <View
          className="absolute left-1 top-1 rounded-md px-1.5 py-0.5"
          style={{ backgroundColor: bg }}
        >
          <Text className="text-[10px] font-bold" style={{ color: fg }}>
            {label}
          </Text>
        </View>

        {/* Services, bottom. Filled means you already pay for it; outlined on a
            dark plate means the title is going but watching it would mean
            taking out a subscription. */}
        <View className="absolute bottom-1 left-1 right-1 flex-row flex-wrap items-center gap-1">
          {services.map((service) => {
            const style = getServiceStyle(service);
            const have = entry.ownedServices.includes(service);
            // The outlined state draws the brand colour as border and text on a
            // dark plate, so a black brand (MUBI) would be invisible; the edge
            // of a filled one disappears the same way. Both take the lifted
            // colour, the fill keeps the real one.
            const edge = onDarkColor(style.color);
            return (
              <View
                key={service}
                className="rounded border px-1 py-0.5"
                style={{
                  backgroundColor: have ? style.color : 'rgba(0,0,0,0.75)',
                  borderColor: edge,
                }}
              >
                <Text
                  className="text-[9px] font-bold"
                  style={{ color: have ? style.textColor : edge }}
                >
                  {style.short}
                </Text>
              </View>
            );
          })}
          {overflow > 0 && (
            <View className="rounded border border-white/30 bg-black/75 px-1 py-0.5">
              <Text className="text-[9px] font-bold text-white">+{overflow}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Reserves both lines whether or not the title needs them, so the service
          caption sits on the same baseline right across a grid row. */}
      <Text
        className="text-xs font-semibold leading-4 text-foreground"
        numberOfLines={2}
        style={{ minHeight: 32 }}
      >
        {entry.title}
      </Text>
      {/* The service, not a verdict. An earlier pass printed "Needs a sub" here
          and it repeated down every column — true, but it turns the caption into
          noise and says nothing the outlined badge has not. Naming the service
          is the part that is actually missing from a two-letter mark. */}
      <Text className="-mt-1 text-[10px] text-muted-foreground" numberOfLines={1}>
        {entry.services.join(' · ')}
      </Text>
    </Pressable>
  );
}
