import Foundation
import CryptoKit

enum PrototypeSystem: String, CaseIterable, Identifiable {
    case dls, material, ant
    var id: String { rawValue }
    var name: String { switch self { case .dls: return "DLS Magician"; case .material: return "Material UI"; case .ant: return "Ant Design" } }
    static func key(userID: String, projectID: String) -> String {
        "prototype-system." + SHA256.hash(data: Data("\(userID):\(projectID)".utf8)).map { String(format: "%02x", $0) }.joined()
    }
}

// Ranges address the original source. Unrecognized text, casing, spacing and newlines
// are retained until the user explicitly edits that block; switching views is lossless.
struct IntentDocument {
    struct Block: Identifiable {
        let id: Int
        let kind: String
        let body: String
        let range: NSRange
    }
    let source: String
    // ECMAScript trim whitespace, matching the production parser. Semantic parsing
    // removes CR, but all editor ranges continue to address the untouched source.
    private static let webWhitespace = CharacterSet(charactersIn: "\u{0009}\u{000A}\u{000B}\u{000C}\u{000D} \u{00A0}\u{1680}\u{2000}\u{2001}\u{2002}\u{2003}\u{2004}\u{2005}\u{2006}\u{2007}\u{2008}\u{2009}\u{200A}\u{2028}\u{2029}\u{202F}\u{205F}\u{3000}\u{FEFF}")
    private static func webLine(_ raw: String) -> String { raw.replacingOccurrences(of: "\r", with: "").trimmingCharacters(in: webWhitespace) }
    var blocks: [Block] {
        let ns = source as NSString
        var headings: [(kind: String, lineStart: Int, bodyStart: Int)] = []
        var offset = 0
        for raw in source.components(separatedBy: "\n") {
            let length = (raw as NSString).length
            let kind = Self.webLine(raw).uppercased()
            if ["GIVEN", "WHEN", "THEN", "AND"].contains(kind) {
                headings.append((kind, offset, min(ns.length, offset + length + 1)))
            }
            offset += length + 1
        }
        return headings.enumerated().map { index, heading in
            let end = index + 1 < headings.count ? headings[index + 1].lineStart : ns.length
            let range = NSRange(location: heading.bodyStart, length: end - heading.bodyStart)
            return Block(id: index, kind: heading.kind,
                         body: ns.substring(with: range).trimmingCharacters(in: .newlines), range: range)
        }
    }
    var valid: Bool { generated(name: "").valid }
    func replacing(_ index: Int, with body: String) -> String {
        guard blocks.indices.contains(index) else { return source }
        let block = blocks[index]
        let suffix = index < blocks.count - 1 ? "\n\n" : ""
        let ns = source as NSString
        let needsNewline = block.range.location > 0 && ns.substring(with: NSRange(location: block.range.location - 1, length: 1)) != "\n"
        return ns.replacingCharacters(in: block.range, with: (needsNewline ? "\n" : "") + body + suffix)
    }
    func appending(_ kind: String) -> String {
        guard ["GIVEN", "WHEN", "THEN", "AND"].contains(kind) else { return source }
        return source + (source.isEmpty ? "" : "\n\n") + kind + "\n"
    }
    func generated(name: String) -> GeneratedWorkflow {
        let parsed = blocks.map { block in
            (kind: block.kind, text: (source as NSString).substring(with: block.range).components(separatedBy: "\n").map(Self.webLine).filter { !$0.isEmpty }.joined(separator: " "))
        }
        // JS \b is an ASCII word boundary; do not use ICU's Unicode \b here.
        let re = try! NSRegularExpression(pattern: "(?i)(?<![A-Za-z0-9_])(?:advertiser|campaign|offline data|signals?|performance|insights?|dataset|audience|pixel|workflow)(?![A-Za-z0-9_])")
        var entities: [String] = []
        for step in parsed {
            let ns = step.text as NSString
            for match in re.matches(in: step.text, range: NSRange(location: 0, length: ns.length)) {
                let entity = ns.substring(with: match.range).lowercased()
                if !entities.contains(entity) { entities.append(entity) }
            }
        }
        return .init(intent: name, version: "1.0", steps: parsed.enumerated().map { i, step in
            .init(id: "step_\(i + 1)", type: step.kind, text: step.text,
                  entities: entities.filter { step.text.lowercased().contains($0) })
        }, entities: entities, valid: ["GIVEN", "WHEN", "THEN"].allSatisfy { required in parsed.contains { $0.kind == required && !$0.text.isEmpty } })
    }
}
