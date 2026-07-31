import { compareVersions, isNewerVersion, normalizeRelease, parseVersion, pickApkAsset } from './appUpdate';

describe('parseVersion', () => {
  it('strips a leading v and splits numeric parts', () => {
    expect(parseVersion('v2.1.3')).toEqual({ parts: [2, 1, 3], prerelease: null });
  });

  it('keeps the prerelease tail separate', () => {
    expect(parseVersion('1.0.0-beta.2')).toEqual({ parts: [1, 0, 0], prerelease: 'beta.2' });
  });

  it('degrades non-numeric segments to 0 instead of NaN', () => {
    expect(parseVersion('1.x.3').parts).toEqual([1, 0, 3]);
  });
});

describe('compareVersions', () => {
  it('orders by numeric precedence', () => {
    expect(compareVersions('2.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.9.9', '2.0')).toBe(-1);
  });

  it('treats missing trailing segments as zero', () => {
    expect(compareVersions('2.0', '2.0.0')).toBe(0);
    expect(compareVersions('2.0.1', '2.0')).toBe(1);
  });

  it('ranks a prerelease below the matching release', () => {
    expect(compareVersions('1.0.0-beta', '1.0.0')).toBe(-1);
    expect(compareVersions('1.0.0', '1.0.0-beta')).toBe(1);
  });
});

describe('isNewerVersion', () => {
  it('is false for the installed version and older tags', () => {
    expect(isNewerVersion('2.0', '2.0.0')).toBe(false);
    expect(isNewerVersion('1.4', '2.0')).toBe(false);
  });

  it('is true only for a strictly newer tag', () => {
    expect(isNewerVersion('2.1', '2.0')).toBe(true);
  });
});

describe('pickApkAsset', () => {
  it('prefers the android package asset', () => {
    expect(
      pickApkAsset([
        { name: 'source.zip', content_type: 'application/zip', browser_download_url: 'https://x/source.zip' },
        {
          name: 'radar-v2.0.apk',
          content_type: 'application/vnd.android.package-archive',
          browser_download_url: 'https://x/radar-v2.0.apk',
        },
      ]),
    ).toBe('https://x/radar-v2.0.apk');
  });

  it('falls back to the .apk extension when the content type is generic', () => {
    expect(
      pickApkAsset([
        { name: 'radar.apk', content_type: 'application/octet-stream', browser_download_url: 'https://x/radar.apk' },
      ]),
    ).toBe('https://x/radar.apk');
  });

  it('returns null when no APK is attached', () => {
    expect(pickApkAsset([])).toBeNull();
    expect(pickApkAsset(undefined)).toBeNull();
  });
});

describe('normalizeRelease', () => {
  it('maps the GitHub payload onto the release shape', () => {
    expect(
      normalizeRelease({
        tag_name: 'v2.0',
        name: 'v2.0',
        body: '  Rating rewrite  ',
        html_url: 'https://github.com/MichalDakowicz/radar/releases/tag/v2.0',
        assets: [
          {
            name: 'radar-v2.0.apk',
            content_type: 'application/vnd.android.package-archive',
            browser_download_url: 'https://x/radar-v2.0.apk',
          },
        ],
      }),
    ).toEqual({
      version: '2.0',
      tag: 'v2.0',
      name: 'v2.0',
      notes: 'Rating rewrite',
      pageUrl: 'https://github.com/MichalDakowicz/radar/releases/tag/v2.0',
      apkUrl: 'https://x/radar-v2.0.apk',
    });
  });

  it('ignores drafts and untagged payloads', () => {
    expect(normalizeRelease({ tag_name: 'v3.0', draft: true })).toBeNull();
    expect(normalizeRelease({})).toBeNull();
  });
});
