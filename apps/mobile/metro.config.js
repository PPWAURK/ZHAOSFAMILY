const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// pdf.js ships inside the app as .bin assets (copied next to the PDF viewer HTML).
config.resolver.assetExts.push("bin");

module.exports = config;
