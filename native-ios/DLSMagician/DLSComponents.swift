import SwiftUI

enum DLSGradientLayer {
    case solid(Color)
    case linear(degrees: CGFloat, stops: [Gradient.Stop])
    case radial(center: UnitPoint, stops: [Gradient.Stop])
}

/// CSS angles use 0° up and 90° right. Endpoints depend on the rendered rectangle.
enum DLSGradientGeometry {
    static func endpoints(size: CGSize, degrees: CGFloat) -> (start: UnitPoint, end: UnitPoint) {
        let radians = degrees * .pi / 180
        let dx = sin(radians), dy = -cos(radians)
        let length = abs(size.width * dx) + abs(size.height * dy)
        let x = dx * length / (2 * max(size.width, 1))
        let y = dy * length / (2 * max(size.height, 1))
        return (UnitPoint(x: 0.5 - x, y: 0.5 - y), UnitPoint(x: 0.5 + x, y: 0.5 + y))
    }

    static func farthestCornerRadius(size: CGSize, center: UnitPoint) -> CGFloat {
        let x = center.x * size.width, y = center.y * size.height
        let dx = max(abs(x), abs(size.width - x))
        let dy = max(abs(y), abs(size.height - y))
        return max(sqrt(dx * dx + dy * dy), 1)
    }
}

/// Exact token layers and geometry; native interpolation and blur still require device comparison.
struct DLSGradientSurface: View {
    private enum Source { case role(DLSTheme.GradientRole), avatar(String) }
    private let source: Source
    @Environment(\.colorScheme) private var scheme

    init(role: DLSTheme.GradientRole) { source = .role(role) }
    init(avatarAccent: String) { source = .avatar(avatarAccent) }

    private func layers(width: CGFloat) -> [DLSGradientLayer] {
        switch source {
        case .role(let role): return DLSTheme.gradientLayers(role, scheme: scheme, width: width)
        case .avatar(let accent): return DLSTheme.avatarLayers(accent, scheme: scheme)
        }
    }

    var body: some View {
        GeometryReader { geometry in
            let layers = self.layers(width: geometry.size.width)
            ZStack {
                // CSS paints the first background on top. SwiftUI paints the last child on top.
                ForEach(Array(layers.reversed().enumerated()), id: \.offset) { entry in
                    layerView(entry.element, size: geometry.size)
                }
            }.frame(width: geometry.size.width, height: geometry.size.height).clipped()
        }.allowsHitTesting(false).accessibilityHidden(true)
    }

    @ViewBuilder private func layerView(_ layer: DLSGradientLayer, size: CGSize) -> some View {
        switch layer {
        case .solid(let color): color
        case .linear(let degrees, let stops):
            let points = DLSGradientGeometry.endpoints(size: size, degrees: degrees)
            LinearGradient(stops: stops, startPoint: points.start, endPoint: points.end)
        case .radial(let center, let stops):
            RadialGradient(stops: stops, center: center, startRadius: 0,
                           endRadius: DLSGradientGeometry.farthestCornerRadius(size: size, center: center))
        }
    }
}

struct DLSAccountAvatar: View {
    let initials: String?
    let accent: String?
    @ScaledMetric(relativeTo: .body) private var diameter: CGFloat = 38

    var body: some View {
        Text(initials.flatMap { $0.isEmpty ? nil : $0 } ?? "?")
            .font(.caption2.weight(.bold)).tracking(0.22)
            .foregroundStyle(DLSTheme.accountAvatarInk(accent))
            .frame(width: diameter, height: diameter)
            .background { DLSGradientSurface(avatarAccent: accent ?? "violet").clipShape(Circle()) }
            .overlay(Circle().stroke(DLSTheme.accountAvatarBorder, lineWidth: 1))
            .accessibilityHidden(true)
    }
}

struct DLSPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.callout.weight(.semibold))
            .foregroundStyle(DLSTheme.primaryInk)
            .padding(.horizontal, 14).frame(minHeight: 44)
            .background(DLSTheme.primaryFill, in: RoundedRectangle(cornerRadius: DLSTheme.radiusButton))
            .opacity(enabled ? (configuration.isPressed ? 0.86 : 1) : 0.45)
    }
}

/// Separate web .btn-gold variant. Generic primary actions retain their own source style.
struct DLSGoldButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.callout.weight(.bold))
            // Source styles.css .btn-gold: ink #18130b, border #d8bd80.
            .foregroundStyle(Color(red: 24/255, green: 19/255, blue: 11/255))
            .padding(.horizontal, 14).frame(minHeight: 44)
            .background {
                DLSGradientSurface(role: .goldButton)
                    .clipShape(RoundedRectangle(cornerRadius: DLSTheme.radiusButton))
            }
            .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusButton)
                .stroke(Color(red: 216/255, green: 189/255, blue: 128/255), lineWidth: 1))
            .opacity(enabled ? (configuration.isPressed ? 0.86 : 1) : 0.45)
    }
}

struct DLSSecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label.font(.callout.weight(.medium))
            .foregroundStyle(DLSTheme.soft)
            .padding(.horizontal, 14).frame(minHeight: 44)
            .background(DLSTheme.surface2, in: RoundedRectangle(cornerRadius: DLSTheme.radiusControl))
            .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusControl).stroke(DLSTheme.border, lineWidth: 1))
            .opacity(enabled ? (configuration.isPressed ? 0.8 : 1) : 0.45)
    }
}

struct DLSBrandLockup: View {
    var body: some View {
        HStack(spacing: 12) {
            BrandMark(size: 32)
            Text("DLS Magician").font(.system(.headline)).fontWeight(.semibold).tracking(-0.36)
                .foregroundStyle(DLSTheme.text)
        }.frame(minHeight: 44).accessibilityElement(children: .combine)
    }
}

struct DLSStatusPill: View {
    let status: String
    private var color: Color {
        if status.lowercased() == "published" { return DLSTheme.green }
        if status.lowercased().contains("review") { return DLSTheme.amber }
        return DLSTheme.muted
    }
    var body: some View {
        HStack(spacing: 5) {
            Circle().fill(color).frame(width: 5, height: 5)
            Text(status).font(.caption)
        }.foregroundStyle(DLSTheme.soft).padding(.horizontal, 8).padding(.vertical, 5)
            .background(color.opacity(0.08), in: Capsule())
            .overlay(Capsule().stroke(color.opacity(0.18), lineWidth: 1))
    }
}

struct DLSProviderRow: View {
    enum Kind { case microsoft, google, email }
    let kind: Kind
    let label: String
    var expanded = false
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: 10) {
            mark.frame(width: 24, height: 24)
            Text(label).font(.callout.weight(.medium)).frame(maxWidth: .infinity)
            Image(systemName: expanded ? "chevron.down" : "chevron.right")
                .font(.caption.weight(.semibold)).foregroundStyle(DLSTheme.muted)
        }.foregroundStyle(DLSTheme.soft).padding(.horizontal, 14).frame(minHeight: 48)
            .background(scheme == .dark ? DLSTheme.surface2 : DLSTheme.surface,
                        in: RoundedRectangle(cornerRadius: DLSTheme.radiusControl))
            .overlay(RoundedRectangle(cornerRadius: DLSTheme.radiusControl).stroke(DLSTheme.border, lineWidth: 1))
            .contentShape(RoundedRectangle(cornerRadius: DLSTheme.radiusControl))
    }
    @ViewBuilder private var mark: some View {
        switch kind {
        case .microsoft:
            VStack(spacing: 2) {
                HStack(spacing: 2) { Rectangle().fill(Color(red: 243/255, green: 83/255, blue: 37/255)); Rectangle().fill(Color(red: 129/255, green: 188/255, blue: 6/255)) }
                HStack(spacing: 2) { Rectangle().fill(Color(red: 5/255, green: 166/255, blue: 240/255)); Rectangle().fill(Color(red: 255/255, green: 186/255, blue: 8/255)) }
            }.frame(width: 16, height: 16)
        case .google:
            Text("G").font(.custom("Arial-BoldMT", size: 21, relativeTo: .body))
                .foregroundStyle(AngularGradient(stops: [
                    .init(color: Color(red: 66/255, green: 133/255, blue: 244/255), location: 0),
                    .init(color: Color(red: 66/255, green: 133/255, blue: 244/255), location: 0.25),
                    .init(color: Color(red: 52/255, green: 168/255, blue: 83/255), location: 0.25),
                    .init(color: Color(red: 52/255, green: 168/255, blue: 83/255), location: 0.41),
                    .init(color: Color(red: 251/255, green: 188/255, blue: 5/255), location: 0.41),
                    .init(color: Color(red: 251/255, green: 188/255, blue: 5/255), location: 0.66),
                    .init(color: Color(red: 234/255, green: 67/255, blue: 53/255), location: 0.66),
                    .init(color: Color(red: 234/255, green: 67/255, blue: 53/255), location: 0.84),
                    .init(color: Color(red: 66/255, green: 133/255, blue: 244/255), location: 0.84),
                    .init(color: Color(red: 66/255, green: 133/255, blue: 244/255), location: 1)
                ], center: .center, startAngle: .degrees(-45), endAngle: .degrees(315)))
        case .email:
            Image(systemName: "envelope").font(.body)
        }
    }
}

struct DLSPageHeading: View {
    let kicker: String
    let title: String
    let description: String
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(kicker.uppercased()).font(.caption.weight(.semibold)).tracking(1.4).foregroundStyle(DLSTheme.muted)
            Text(title).font(.custom("Georgia", size: 36, relativeTo: .largeTitle)).foregroundStyle(DLSTheme.text)
            Text(description).font(.subheadline).foregroundStyle(DLSTheme.soft).fixedSize(horizontal: false, vertical: true)
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
}
