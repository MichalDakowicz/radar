import { getServiceStyle, onDarkColor } from './services';

const luma = (hex: string) => {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

describe('onDarkColor', () => {
  it('leaves a colour that already reads on dark completely alone', () => {
    expect(onDarkColor('#dc2626')).toBe('#dc2626'); // Netflix
    expect(onDarkColor('#1ce783')).toBe('#1ce783'); // Hulu
    expect(onDarkColor('#e5e5e5')).toBe('#e5e5e5'); // Apple TV+
  });

  it('lifts pure black off the background', () => {
    const lifted = onDarkColor('#000000'); // Mubi
    expect(lifted).not.toBe('#000000');
    expect(luma(lifted)).toBeGreaterThanOrEqual(0.27);
  });

  it('lifts every near-black brand the app ships', () => {
    for (const service of ['Mubi', 'Criterion Channel', 'SkyShowtime']) {
      expect(luma(onDarkColor(getServiceStyle(service).color))).toBeGreaterThanOrEqual(0.27);
    }
  });

  it('keeps the hue rather than washing everything to the same grey', () => {
    // SkyShowtime is a navy; lifted it must still be bluest of its channels.
    const lifted = onDarkColor('#1b1f3b').replace('#', '');
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(lifted.slice(i, i + 2), 16));
    expect(b).toBeGreaterThan(r);
    expect(b).toBeGreaterThan(g);
  });

  it('passes through anything that is not a six-digit hex', () => {
    expect(onDarkColor('hsl(0 84% 60%)')).toBe('hsl(0 84% 60%)');
    expect(onDarkColor('#fff')).toBe('#fff');
  });
});
