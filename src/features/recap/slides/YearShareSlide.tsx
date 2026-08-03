import { View, useWindowDimensions } from 'react-native';

import { ShareCard } from '@/features/recap/ShareCard';
import type { ShareCardData } from '@/lib/recapShare';

type YearShareSlideProps = { data: ShareCardData };

/**
 * The report's last page is the share card itself, rather than a second
 * certificate: by page nine the numbers have been read, and the only thing left
 * to do with them is send them to someone. The Share button is the player's
 * action for this page.
 */
export function YearShareSlide({ data }: YearShareSlideProps) {
  const { width, height } = useWindowDimensions();
  // Fit the 9:16 card in what is left after the chrome and the action button.
  const card = Math.min(width - 92, Math.round(((height - 300) * 9) / 16));

  return (
    <View className="items-center">
      <ShareCard data={data} width={card} />
    </View>
  );
}
