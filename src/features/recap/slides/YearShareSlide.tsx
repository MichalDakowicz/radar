import { Share2 } from 'lucide-react-native';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { ShareCard } from '@/features/recap/ShareCard';
import { RECAP } from '@/features/recap/recapTheme';
import type { ShareCardData } from '@/lib/recapShare';

type YearShareSlideProps = { data: ShareCardData; onShare: () => void };

/**
 * The report's last page is the share card itself, rather than a second
 * certificate: by page nine the numbers have been read, and the only thing left
 * to do with them is send them to someone.
 */
export function YearShareSlide({ data, onShare }: YearShareSlideProps) {
  const { width, height } = useWindowDimensions();
  // Fit the 9:16 card in whatever is left after the chrome and the button.
  const card = Math.min(width - 92, Math.round(((height - 260) * 9) / 16));

  return (
    <View className="items-center gap-5">
      <ShareCard data={data} width={card} />
      <Pressable
        onPress={onShare}
        className="h-[52px] w-full flex-row items-center justify-center gap-2.5 rounded-full active:opacity-80"
        style={{ backgroundColor: RECAP.ink }}
        accessibilityRole="button"
        accessibilityLabel="Share the report"
      >
        <Share2 size={16} color="#0a0a0a" strokeWidth={2.4} />
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0a0a0a' }}>Share the report</Text>
      </Pressable>
    </View>
  );
}
