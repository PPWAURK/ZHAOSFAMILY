const { withAndroidManifest } = require('@expo/config-plugins');

function withAndroidReleaseNetworkSecurity(config) {
  return withAndroidManifest(config, (modConfig) => {
    const application = modConfig.modResults.manifest.application?.[0];

    if (application) {
      application.$['android:usesCleartextTraffic'] = 'false';
    }

    return modConfig;
  });
}

module.exports = withAndroidReleaseNetworkSecurity;
