import AppKit

let px = 1024
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: px, pixelsHigh: px,
    bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
    colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
let S = CGFloat(px)

// Rounded-rect background (deep ZHAO red).
let inset: CGFloat = S * 0.085
let bg = NSRect(x: inset, y: inset, width: S - 2*inset, height: S - 2*inset)
let radius = bg.width * 0.235
NSColor(calibratedRed: 0.64, green: 0.18, blue: 0.18, alpha: 1).setFill()
NSBezierPath(roundedRect: bg, xRadius: radius, yRadius: radius).fill()

// Heartbeat / monitoring line.
let line = NSBezierPath()
line.lineWidth = S * 0.040
line.lineJoinStyle = .round
line.lineCapStyle = .round
let midY = S * 0.50
let pts: [(CGFloat, CGFloat)] = [
    (0.255, 0.50), (0.40, 0.50), (0.465, 0.665), (0.55, 0.305),
    (0.625, 0.50), (0.745, 0.50)
]
for (i, p) in pts.enumerated() {
    let pt = NSPoint(x: S * p.0, y: midY + (S * (p.1 - 0.50)))
    if i == 0 { line.move(to: pt) } else { line.line(to: pt) }
}
NSColor.white.setStroke()
line.stroke()

// Status dot (green) bottom-right of the line.
let dotR = S * 0.052
let dot = NSRect(x: S * 0.745 - dotR, y: midY - dotR, width: dotR*2, height: dotR*2)
NSColor(calibratedRed: 0.18, green: 0.72, blue: 0.45, alpha: 1).setFill()
NSBezierPath(ovalIn: dot).fill()

NSGraphicsContext.restoreGraphicsState()

let out = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "icon_1024.png"
let png = rep.representation(using: .png, properties: [:])!
try! png.write(to: URL(fileURLWithPath: out))
print("wrote \(out)")
