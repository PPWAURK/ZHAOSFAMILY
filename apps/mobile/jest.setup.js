/* global jest, require */
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    WebView: (props) => React.createElement(View, props),
  };
});

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    VideoView: (props) => React.createElement(View, props),
    createVideoPlayer: jest.fn(() => ({
      audioMixingMode: 'doNotMix',
      currentTime: 0,
      duration: 0,
      muted: true,
      pause: jest.fn(),
      play: jest.fn(),
      playbackRate: 1,
      release: jest.fn(),
      status: 'idle',
      timeUpdateEventInterval: 0,
    })),
  };
});
