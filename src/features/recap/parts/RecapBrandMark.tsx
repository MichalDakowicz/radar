import { LinearGradient } from 'expo-linear-gradient';
import { Radio } from 'lucide-react-native';

type RecapBrandMarkProps = { size?: number };

/**
 * The blue Radar tile the player's chrome and the share card are signed with.
 * Built here rather than imported: the app has no logo component, and the recap
 * is the first surface that needs the mark at two sizes.
 */
export function RecapBrandMark({ size = 22 }: RecapBrandMarkProps) {
  return (
    <LinearGradient
      colors={['#3b82f6', '#1d4ed8']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Radio size={Math.round(size * 0.6)} color="#fff" strokeWidth={2.6} />
    </LinearGradient>
  );
}
