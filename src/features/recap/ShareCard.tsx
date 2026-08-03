import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { RecapBrandMark } from '@/features/recap/parts/RecapBrandMark';
import { RecapPoster } from '@/features/recap/parts/RecapPoster';
import { MONO, RECAP } from '@/features/recap/recapTheme';
import type { ShareCardData } from '@/lib/recapShare';

type ShareCardProps = { data: ShareCardData; width: number };

/**
 * The 9:16 card (design 1c) — one card, not nine: everything a friend needs to be
 * annoyed by, at a glance. Drawn at whatever width it is given so the same
 * component works as the yearly's closing slide and as a preview elsewhere.
 */
export function ShareCard({ data, width }: ShareCardProps) {
  const height = Math.round((width * 16) / 9);
  const scale = width / 320;
  const posterWidth = data.posters.length > 1 ? Math.floor((width - 52 - (data.posters.length - 1) * 6) / data.posters.length) : 84;

  return (
    <View
      style={{
        width,
        height,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: RECAP.bg,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,.12)',
        padding: 26,
        justifyContent: 'space-between',
      }}
    >
      {/* Two stacked washes stand in for the design's radial gradients, which
          React Native's linear-only gradient cannot express. */}
      <LinearGradient
        colors={['rgba(59,130,246,.28)', 'transparent']}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, height: height * 0.45 }}
      />
      <LinearGradient
        colors={['transparent', 'rgba(168,85,247,.2)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: height * 0.4 }}
      />

      <View>
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <RecapBrandMark size={24} />
            <Text style={{ fontSize: 12, fontWeight: '700', color: RECAP.ink }}>Radar</Text>
          </View>
          <Text style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: '600', letterSpacing: 1.3, color: RECAP.muted }}>
            {data.stamp}
          </Text>
        </View>
        <Text
          className="mt-6"
          style={{ fontSize: 46 * scale, lineHeight: 42 * scale, fontWeight: '700', letterSpacing: -2 * scale, color: RECAP.ink }}
        >
          {data.headline}
        </Text>
      </View>

      <View className="flex-row flex-wrap" style={{ rowGap: 20, columnGap: 14 }}>
        {data.cells.map((cell) => (
          <View key={cell.label} style={{ width: '45%' }}>
            <Text
              className="mb-1.5"
              style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: RECAP.muted }}
            >
              {cell.label}
            </Text>
            <Text numberOfLines={1} style={{ fontSize: cell.value.length > 6 ? 22 : 32, fontWeight: '700', letterSpacing: -0.8, color: RECAP.ink }}>
              {cell.value}
            </Text>
          </View>
        ))}
      </View>

      <View>
        {data.posters.length > 0 && (
          <>
            <Text
              className="mb-2.5"
              style={{ fontSize: 9.5, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase', color: RECAP.muted }}
            >
              {data.postersLabel}
            </Text>
            <View className="flex-row" style={{ gap: 6 }}>
              {data.posters.map((poster) => (
                <RecapPoster
                  key={`${poster.tmdbId}-${poster.title}`}
                  coverUrl={poster.coverUrl}
                  title={poster.title}
                  width={posterWidth}
                  radius={4}
                />
              ))}
            </View>
          </>
        )}
        <View
          className="mt-5 flex-row items-center justify-between pt-3.5"
          style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.14)' }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: RECAP.muted }}>{data.footer}</Text>
          {/* No URL here on purpose: the app has no canonical public domain, and
              a made-up one on a card people screenshot would be a dead link. */}
          <Text style={{ fontFamily: MONO, fontSize: 10, fontWeight: '600', letterSpacing: 1.2, color: RECAP.faint }}>RADAR</Text>
        </View>
      </View>
    </View>
  );
}
