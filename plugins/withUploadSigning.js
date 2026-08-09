/**
 * Wires the Play upload key into the release build type.
 *
 * `android/` is prebuild output, so hand-editing `app/build.gradle` does not survive
 * `expo prebuild`. This plugin re-applies the signing config on every prebuild and reads
 * the credentials from `credentials/android-signing.properties` — a gitignored file that
 * never leaves the machine. Without that file the release build falls back to the debug
 * keystore, which is what the GitHub-release APKs are still signed with.
 */
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = 'radarSigningProps';

const SIGNING_BLOCK = `    def radarSigningProps = new Properties()
    def radarSigningFile = rootProject.file('../credentials/android-signing.properties')
    if (radarSigningFile.exists()) {
        radarSigningFile.withInputStream { radarSigningProps.load(it) }
    }
    def radarHasUploadKey = radarSigningProps.containsKey('storeFile')

    signingConfigs {
        upload {
            if (radarHasUploadKey) {
                storeFile file(radarSigningProps['storeFile'])
                storePassword radarSigningProps['storePassword']
                keyAlias radarSigningProps['keyAlias']
                keyPassword radarSigningProps['keyPassword']
            }
        }
`;

function patchBuildGradle(contents) {
  if (contents.includes(MARKER)) return contents;

  const withSigningConfig = contents.replace(/^ {4}signingConfigs \{\n/m, SIGNING_BLOCK);
  if (withSigningConfig === contents) {
    throw new Error('withUploadSigning: could not find the signingConfigs block in app/build.gradle');
  }

  const withRelease = withSigningConfig.replace(
    /(release \{\n(?:.*\n)*?\s*)signingConfig signingConfigs\.debug/m,
    '$1signingConfig radarHasUploadKey ? signingConfigs.upload : signingConfigs.debug',
  );
  if (withRelease === withSigningConfig) {
    throw new Error('withUploadSigning: could not find the release signingConfig in app/build.gradle');
  }

  return withRelease;
}

module.exports = function withUploadSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};
