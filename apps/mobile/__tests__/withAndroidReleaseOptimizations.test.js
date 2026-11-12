jest.mock('@expo/config-plugins', () => ({
  withGradleProperties: jest.fn((config, action) => ({
    ...config,
    applyGradleMod: action,
  })),
}));

const withAndroidReleaseOptimizations = require('../plugins/with-android-release-optimizations');

function apply(properties) {
  const config = withAndroidReleaseOptimizations({ name: 'Zhao Family' });
  const modConfig = { modResults: properties };
  config.applyGradleMod(modConfig);
  return modConfig.modResults;
}

function valueOf(properties, key) {
  return properties.find((item) => item.type === 'property' && item.key === key)?.value;
}

describe('withAndroidReleaseOptimizations', () => {
  it('enables R8 and resource shrinking for release builds', () => {
    const result = apply([]);

    expect(valueOf(result, 'android.enableMinifyInReleaseBuilds')).toBe('true');
    expect(valueOf(result, 'android.enableShrinkResourcesInReleaseBuilds')).toBe('true');
  });

  it('limits native ABIs to ARM', () => {
    const result = apply([
      { type: 'property', key: 'reactNativeArchitectures', value: 'armeabi-v7a,arm64-v8a,x86,x86_64' },
    ]);

    expect(valueOf(result, 'reactNativeArchitectures')).toBe('armeabi-v7a,arm64-v8a');
  });

  it('overwrites existing values instead of duplicating keys', () => {
    const result = apply([
      { type: 'property', key: 'android.enableMinifyInReleaseBuilds', value: 'false' },
    ]);

    expect(result.filter((item) => item.key === 'android.enableMinifyInReleaseBuilds')).toHaveLength(1);
    expect(valueOf(result, 'android.enableMinifyInReleaseBuilds')).toBe('true');
  });
});
