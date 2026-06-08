Pod::Spec.new do |s|
  s.name           = "ScreenRecordingDetector"
  s.version        = "0.1.0"
  s.summary        = "iOS screen recording detection for Expo"
  s.homepage       = "https://github.com/zhao-family/mobile"
  s.license        = "UNLICENSED"
  s.author         = "ZHAO's Family"
  s.source         = { git: "" }
  s.static_framework = true

  s.platform       = :ios, "15.0"
  s.swift_version  = "5.4"
  s.source_files   = "**/*.swift"

  s.dependency "ExpoModulesCore"
end
