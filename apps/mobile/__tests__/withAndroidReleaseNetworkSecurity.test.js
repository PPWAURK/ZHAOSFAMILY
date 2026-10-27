jest.mock('@expo/config-plugins', () => ({
  withAndroidManifest: jest.fn((config, action) => ({
    ...config,
    applyManifestMod: action,
  })),
}));

const withAndroidReleaseNetworkSecurity = require('../plugins/with-android-release-network-security');

describe('withAndroidReleaseNetworkSecurity', () => {
  it('disables cleartext traffic on the Android application', () => {
    const config = withAndroidReleaseNetworkSecurity({ name: 'Zhao Family' });
    const modConfig = {
      modResults: {
        manifest: {
          application: [{ $: {} }],
        },
      },
    };

    expect(config.applyManifestMod(modConfig)).toBe(modConfig);
    expect(
      modConfig.modResults.manifest.application[0].$['android:usesCleartextTraffic'],
    ).toBe('false');
  });

  it('leaves the manifest unchanged when no application node exists', () => {
    const config = withAndroidReleaseNetworkSecurity({ name: 'Zhao Family' });
    const modConfig = { modResults: { manifest: {} } };

    expect(config.applyManifestMod(modConfig)).toBe(modConfig);
    expect(modConfig.modResults.manifest.application).toBeUndefined();
  });
});
