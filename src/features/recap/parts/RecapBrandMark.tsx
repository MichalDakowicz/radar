import Logo from '@/assets/brand/logo.svg';

type RecapBrandMarkProps = { size?: number };

/**
 * The app's own mark, signing the share card. The recap used to draw a stand-in
 * tile with a generic radio glyph; the real logo ships as an SVG (the same one
 * the login screen and the launcher icon use), so use that instead — a card
 * people screenshot should carry the mark they recognise.
 */
export function RecapBrandMark({ size = 22 }: RecapBrandMarkProps) {
  return <Logo width={size} height={size} />;
}
