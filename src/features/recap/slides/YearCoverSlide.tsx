import { Text, View } from 'react-native';

import { MONO, RECAP } from '@/features/recap/recapTheme';
import type { YearlyRecap } from '@/lib/recap';

type YearCoverSlideProps = { recap: YearlyRecap; username: string };

const rule = { borderColor: 'rgba(255,255,255,.22)' };

/**
 * The archive cover: a filed document rather than a party invitation. Restrained
 * on purpose — the monthly recap is the loud one, and a year deserves a masthead.
 */
export function YearCoverSlide({ recap, username }: YearCoverSlideProps) {
  return (
    <>
      <View className="flex-row items-center justify-between pb-2.5" style={{ borderBottomWidth: 1, ...rule }}>
        <Stamp>RADAR · PERSONAL ARCHIVE</Stamp>
        <Stamp>No. {String(recap.edition).padStart(2, '0')}</Stamp>
      </View>

      <View>
        <Text style={{ fontSize: 15, color: RECAP.muted, letterSpacing: 0.3 }}>The</Text>
        <Text className="mt-1" style={{ fontSize: 44, lineHeight: 42, fontWeight: '700', letterSpacing: -1.5, color: RECAP.ink }}>
          Annual{'\n'}Report
        </Text>
        <Text
          className="mt-3.5"
          style={{ fontSize: 112, lineHeight: 92, fontWeight: '300', letterSpacing: -6, color: 'rgba(250,250,250,.86)' }}
        >
          {recap.key}
        </Text>
        <Text className="mt-5" style={{ fontSize: 14, lineHeight: 22, color: RECAP.muted, maxWidth: 300 }}>
          Twelve months of what you watched, counted properly. Nine pages. No exaggeration was necessary.
        </Text>
      </View>

      <View className="flex-row items-end justify-between pt-2.5" style={{ borderTopWidth: 1, ...rule }}>
        <View>
          <Stamp>PREPARED FOR</Stamp>
          <Stamp bright>@{username}</Stamp>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Stamp>PERIOD</Stamp>
          <Stamp bright>01.01 — 31.12</Stamp>
        </View>
      </View>
    </>
  );
}

function Stamp({ children, bright }: { children: React.ReactNode; bright?: boolean }) {
  return (
    <Text
      style={{
        fontFamily: MONO,
        fontSize: 9.5,
        lineHeight: 15,
        fontWeight: '600',
        letterSpacing: 1.2,
        color: bright ? RECAP.ink : RECAP.muted,
      }}
    >
      {children}
    </Text>
  );
}
