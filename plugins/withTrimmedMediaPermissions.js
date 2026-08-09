/**
 * Strips the media permissions Radar does not use out of the merged manifest.
 *
 * `expo-image-picker` and `expo-media-library` declare a broad set in their own library
 * manifests — including RECORD_AUDIO, which a watchlist app has no business asking for.
 * Play's photo and video permissions policy then demands a written justification for
 * READ_MEDIA_IMAGES/VIDEO, and Radar cannot honestly give one: picking a profile picture is
 * the "one-time or infrequent" case the policy tells you to serve with the system photo
 * picker instead.
 *
 * Radar needs none of them:
 *   - avatars go through ImagePicker.launchImageLibraryAsync, which is the Android photo
 *     picker on API 33+ and grants access to the single chosen image with no permission
 *   - saving a Recap card calls MediaLibrary with writeOnly, which never reads the gallery
 *
 * READ_EXTERNAL_STORAGE (maxSdkVersion 32) is deliberately left alone — it is what covers
 * both paths on the Android versions that predate the photo picker.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const REMOVE = [
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
  'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
  'android.permission.RECORD_AUDIO',
  // expo-image-picker declares this "for picking images from camera directly". Radar only
  // ever calls launchImageLibraryAsync, so the app would be asking for the camera it never
  // opens - the kind of unexplained permission a Play reviewer stops on.
  'android.permission.CAMERA',
];

module.exports = function withTrimmedMediaPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // The tools namespace is what makes node="remove" mean anything at merge time.
    manifest.$ = manifest.$ || {};
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';

    // Drop any copy an earlier plugin wrote into the app manifest, then re-add each one as a
    // removal marker so the library manifests cannot merge theirs back in.
    const kept = (manifest['uses-permission'] || []).filter((p) => !REMOVE.includes(p.$?.['android:name']));

    manifest['uses-permission'] = [
      ...kept,
      ...REMOVE.map((name) => ({ $: { 'android:name': name, 'tools:node': 'remove' } })),
    ];

    return cfg;
  });
};
