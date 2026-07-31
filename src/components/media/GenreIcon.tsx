import {
  Baby,
  Compass,
  Drama,
  Ghost,
  Heart,
  Landmark,
  Laugh,
  Mic,
  Mountain,
  Music,
  Newspaper,
  Rocket,
  Search,
  Shield,
  Siren,
  Sparkles,
  Swords,
  Tag,
  Tv,
  Users,
  Video,
  WandSparkles,
  Zap,
} from 'lucide-react-native';

import { genreIconKey, type GenreIconKey } from '@/lib/genreIcons';

type IconComponent = typeof Tag;

const ICONS: Record<GenreIconKey, IconComponent> = {
  action: Swords,
  adventure: Compass,
  animation: Sparkles,
  comedy: Laugh,
  crime: Siren,
  documentary: Video,
  drama: Drama,
  family: Users,
  fantasy: WandSparkles,
  history: Landmark,
  horror: Ghost,
  kids: Baby,
  music: Music,
  mystery: Search,
  news: Newspaper,
  reality: Tv,
  romance: Heart,
  scifi: Rocket,
  talk: Mic,
  thriller: Zap,
  war: Shield,
  western: Mountain,
  default: Tag,
};

// Small glyph for a genre chip. Anything TMDB throws at it that has no icon of
// its own falls back to a generic tag rather than shifting the chip layout.
export function GenreIcon({ genre, size = 13, color }: { genre: string; size?: number; color?: string }) {
  const Icon = ICONS[genreIconKey(genre)];
  return <Icon size={size} color={color ?? 'hsl(0 0% 63.9%)'} />;
}
