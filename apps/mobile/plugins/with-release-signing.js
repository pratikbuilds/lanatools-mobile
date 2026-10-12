// @ts-check
// Signs release builds with the keystore named by LANATOOLS_RELEASE_* when
// those variables are set (scripts/build-release.sh exports them). Without
// them the generated Gradle file's behaviour is kept: release builds are
// signed with the debug key, which is what `expo run:android --variant
// release` expects on an emulator.
const { withAppBuildGradle } = require('expo/config-plugins')

const MARKER = 'LANATOOLS_RELEASE_KEYSTORE'

const SIGNING_CONFIG = `
        release {
            def releaseKeystore = System.getenv('${MARKER}')
            if (releaseKeystore) {
                storeFile file(releaseKeystore)
                storePassword System.getenv('LANATOOLS_RELEASE_KEYSTORE_PASSWORD')
                keyAlias System.getenv('LANATOOLS_RELEASE_KEY_ALIAS')
                keyPassword System.getenv('LANATOOLS_RELEASE_KEY_PASSWORD')
            }
        }
    }`

const DEBUG_CONFIG_END = /keyPassword 'android'\n {8}\}\n {4}\}/
const RELEASE_BUILD_TYPE_SIGNING =
  /(signed-apk-android\.\n {12})signingConfig signingConfigs\.debug/

/** @param {string} gradle */
function addReleaseSigning(gradle) {
  if (gradle.includes(MARKER)) return gradle
  if (
    !DEBUG_CONFIG_END.test(gradle) ||
    !RELEASE_BUILD_TYPE_SIGNING.test(gradle)
  ) {
    throw new Error(
      'with-release-signing: android/app/build.gradle no longer matches the Expo template; update the plugin',
    )
  }
  return gradle
    .replace(
      DEBUG_CONFIG_END,
      (match) => match.slice(0, -'\n    }'.length) + SIGNING_CONFIG,
    )
    .replace(
      RELEASE_BUILD_TYPE_SIGNING,
      `$1signingConfig System.getenv('${MARKER}') ? signingConfigs.release : signingConfigs.debug`,
    )
}

/** @type {import('expo/config-plugins').ConfigPlugin} */
const withReleaseSigning = (config) =>
  withAppBuildGradle(config, (config) => {
    config.modResults.contents = addReleaseSigning(config.modResults.contents)
    return config
  })

module.exports = withReleaseSigning
module.exports.addReleaseSigning = addReleaseSigning
