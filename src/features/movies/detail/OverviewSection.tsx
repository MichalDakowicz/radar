import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

type OverviewSectionProps = {
  overview: string;
  editable?: boolean;
  onChange?: (overview: string) => void;
};

const COLLAPSED_LINES = 2;
const LINE_HEIGHT = 22;

// Description, always in the main scroll body (doc 12 part 1 unify) - not in
// the hero anymore, so it reads the same whether the title is owned or not.
// Editable only for manually-added titles (no tmdbId) that have no TMDB copy
// to protect. Read-only mode starts clamped to a few lines and expands on tap
// since some overviews run long.
export function OverviewSection({ overview, editable, onChange }: OverviewSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Text className="text-lg font-bold text-foreground">Overview</Text>
      </View>
      {editable ? (
        <TextInput
          value={overview}
          onChangeText={onChange}
          multiline
          placeholder="Write a short description…"
          placeholderTextColor="hsl(0 0% 63.9%)"
          className="min-h-24 rounded-xl border border-border bg-secondary px-3 py-3 leading-relaxed text-foreground"
        />
      ) : (
        <Pressable onPress={() => setExpanded((e) => !e)} disabled={!truncated}>
          {/* Hidden, unclamped measurer - onTextLayout isn't implemented by
              react-native-web, so line count can't be read directly there.
              Instead give both copies a fixed lineHeight and derive the line
              count from measured pixel height via onLayout, which works on
              web too. */}
          <Text
            className="text-muted-foreground"
            style={{ position: 'absolute', top: 0, left: 0, right: 0, opacity: 0, lineHeight: LINE_HEIGHT, pointerEvents: 'none' }}
            onLayout={(e) => setTruncated(Math.round(e.nativeEvent.layout.height / LINE_HEIGHT) > COLLAPSED_LINES)}
          >
            {overview || 'No overview available.'}
          </Text>
          <Text
            numberOfLines={expanded ? undefined : COLLAPSED_LINES}
            className="text-muted-foreground"
            style={{ lineHeight: LINE_HEIGHT }}
          >
            {overview || 'No overview available.'}
          </Text>
          {truncated && (
            <Text className="mt-1 text-xs font-semibold text-primary">{expanded ? 'Show less' : 'Show more'}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}
