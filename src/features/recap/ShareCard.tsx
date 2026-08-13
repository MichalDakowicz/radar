import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';

import { RecapBrandMark } from '@/features/recap/parts/RecapBrandMark';
import { RecapPoster } from '@/features/recap/parts/RecapPoster';
import { leading, MONO, RECAP } from '@/features/recap/recapTheme';
import type { ShareCardData } from '@/lib/recapShare';

type ShareCardProps = { data: ShareCardData; width: number };

/** The width the card was designed at; every size below is a fraction of it. */
export const SHARE_CARD_DESIGN_WIDTH = 320;

/**
 * The 9:16 card (design 1c) — one card, not nine: everything a friend needs to be
 * annoyed by, at a glance. Drawn at whatever width it is given so the same
 * component works as the yearly's closing slide, as an archive thumbnail, and as
 * the bitmap the share sheet sends.
 *
 * Every dimension is scaled off the design width rather than fixed, so the card
 * captured at 1080px is the same card, not a 320px layout with big headlines: the
 * image that leaves the app has to match what was on screen.
 */
export function ShareCard({ data, width }: ShareCardProps) {
  const height = Math.round((width * 16) / 9);
  const s = width / SHARE_CARD_DESIGN_WIDTH;
  const pad = 26 * s;
  const posterWidth =
    data.posters.length > 1
      ? Math.floor((width - pad * 2 - (data.posters.length - 1) * 6 * s) / data.posters.length)
      : 84 * s;

  return (
    <View
      style={{
        width,
        height,
        borderRadius: 20 * s,
        overflow: 'hidden',
        backgroundColor: RECAP.bg,
        borderWidth: 1 * s,
        borderColor: 'rgba(255,255,255,.12)',
        padding: pad,
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
          <View className="flex-row items-center" style={{ gap: 8 * s }}>
            <RecapBrandMark size={24 * s} />
            <Text style={{ fontSize: 12 * s, fontWeight: '700', color: RECAP.ink }}>Radar</Text>
          </View>
          <Text
            style={{ fontFamily: MONO, fontSize: 9.5 * s, fontWeight: '600', letterSpacing: 1.3 * s, color: RECAP.muted }}
          >
            {data.stamp}
          </Text>
        </View>
        <Text
          style={{
            marginTop: 24 * s,
            fontSize: 46 * s,
            lineHeight: leading(46 * s, 42 * s),
            fontWeight: '700',
            letterSpacing: -2 * s,
            color: RECAP.ink,
          }}
        >
          {data.headline}
        </Text>
      </View>

      <View className="flex-row flex-wrap" style={{ rowGap: 20 * s, columnGap: 14 * s }}>
        {data.cells.map((cell) => (
          <View key={cell.label} style={{ width: '45%' }}>
            <Text
              style={{
                marginBottom: 6 * s,
                fontSize: 9.5 * s,
                fontWeight: '600',
                letterSpacing: 1 * s,
                textTransform: 'uppercase',
                color: RECAP.muted,
              }}
            >
              {cell.label}
            </Text>
            <Text
              numberOfLines={1}
              style={{
                fontSize: (cell.value.length > 6 ? 22 : 32) * s,
                fontWeight: '700',
                letterSpacing: -0.8 * s,
                color: RECAP.ink,
              }}
            >
              {cell.value}
            </Text>
          </View>
        ))}
      </View>

      <View>
        {data.posters.length > 0 && (
          <>
            <Text
              style={{
                marginBottom: 10 * s,
                fontSize: 9.5 * s,
                fontWeight: '600',
                letterSpacing: 1 * s,
                textTransform: 'uppercase',
                color: RECAP.muted,
              }}
            >
              {data.postersLabel}
            </Text>
            <View className="flex-row" style={{ gap: 6 * s }}>
              {data.posters.map((poster) => (
                <RecapPoster
                  key={`${poster.tmdbId}-${poster.title}`}
                  coverUrl={poster.coverUrl}
                  title={poster.title}
                  width={posterWidth}
                  radius={4 * s}
                />
              ))}
            </View>
          </>
        )}
        <View
          className="flex-row items-center justify-between"
          style={{ marginTop: 20 * s, paddingTop: 14 * s, borderTopWidth: 1 * s, borderTopColor: 'rgba(255,255,255,.14)' }}
        >
          <Text style={{ fontSize: 11 * s, fontWeight: '600', color: RECAP.muted }}>{data.footer}</Text>
          {/* No URL here on purpose: the app has no canonical public domain, and
              a made-up one on a card people screenshot would be a dead link. */}
          <Text style={{ fontFamily: MONO, fontSize: 10 * s, fontWeight: '600', letterSpacing: 1.2 * s, color: RECAP.faint }}>
            RADAR
          </Text>
        </View>
      </View>
    </View>
  );
}
