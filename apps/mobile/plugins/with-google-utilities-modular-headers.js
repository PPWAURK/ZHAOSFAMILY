const { withPodfile } = require('@expo/config-plugins');
const {
  mergeContents,
  removeGeneratedContents,
} = require('@expo/config-plugins/build/utils/generateCode');

const TAG = 'zhao-family-google-utilities-modular-headers';
const ANCHOR = /target ['"][^'"]+['"] do/;
const POD_DECLARATION = "pod 'GoogleUtilities', :modular_headers => true";

function setGoogleUtilitiesModularHeaders(src, enabled = true) {
  if (!enabled) {
    return removeGeneratedContents(src, TAG) ?? src;
  }

  return mergeContents({
    src,
    newSrc: POD_DECLARATION,
    tag: TAG,
    anchor: ANCHOR,
    offset: 1,
    comment: '#',
  }).contents;
}

function withGoogleUtilitiesModularHeaders(config) {
  return withPodfile(config, config => {
    config.modResults.contents = setGoogleUtilitiesModularHeaders(
      config.modResults.contents,
    );

    return config;
  });
}

module.exports = withGoogleUtilitiesModularHeaders;
module.exports.setGoogleUtilitiesModularHeaders = setGoogleUtilitiesModularHeaders;
