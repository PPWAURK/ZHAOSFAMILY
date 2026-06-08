import ExpoModulesCore
import UIKit

/// Expo module that exposes UIScreen.isCaptured to JavaScript.
///
/// Use cases:
///   - Detect iOS screen recording in real time
///   - Detect AirPlay / screen mirroring
///
/// Requires EAS Build or Dev Client – not available in Expo Go.
public final class ScreenRecordingDetectorModule: Module {
  private var isObserving = false

  // ── Module definition ──────────────────────────────────────────────────
  public func definition() -> ModuleDefinition {
    Name("ScreenRecordingDetector")

    // Property: isCaptured (read-only)
    Property("isCaptured") { () -> Bool in
      UIScreen.main.isCaptured
    }

    // Events
    Events("onCapturedChanged")

    // Start observing when the first JS listener is added
    OnStartObserving {
      startCaptureObservation()
    }

    // Stop observing when the last JS listener is removed
    OnStopObserving {
      stopCaptureObservation()
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private func startCaptureObservation() {
    guard !isObserving else { return }
    isObserving = true

    NotificationCenter.default.addObserver(
      self,
      selector: #selector(captureStateDidChange),
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
  }

  private func stopCaptureObservation() {
    guard isObserving else { return }
    isObserving = false

    NotificationCenter.default.removeObserver(
      self,
      name: UIScreen.capturedDidChangeNotification,
      object: nil
    )
  }

  @objc
  private func captureStateDidChange() {
    sendEvent("onCapturedChanged", ["isCaptured": UIScreen.main.isCaptured])
  }

  deinit {
    stopCaptureObservation()
  }
}
