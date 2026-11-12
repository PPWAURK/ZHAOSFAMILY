const { shouldStripDevClient } = require('../scripts/strip-dev-client');

describe('shouldStripDevClient', () => {
  it('keeps the dev client for the development profile', () => {
    expect(shouldStripDevClient({ EAS_BUILD_PROFILE: 'development' })).toBe(false);
  });

  it('strips it for production and preview profiles', () => {
    expect(shouldStripDevClient({ EAS_BUILD_PROFILE: 'production' })).toBe(true);
    expect(shouldStripDevClient({ EAS_BUILD_PROFILE: 'preview' })).toBe(true);
  });

  it('does nothing outside EAS unless explicitly requested', () => {
    expect(shouldStripDevClient({})).toBe(false);
    expect(shouldStripDevClient({ STRIP_DEV_CLIENT: '1' })).toBe(true);
  });
});
