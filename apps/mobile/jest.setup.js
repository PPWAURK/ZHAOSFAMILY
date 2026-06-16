/* global jest, require */
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    WebView: (props) => React.createElement(View, props),
  };
});
