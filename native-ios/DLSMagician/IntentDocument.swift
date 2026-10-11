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
    var blocks: [Block] {
        let ns = source as NSString
        let re = try! NSRegularExpression(pattern: "(?im)^(GIVEN|WHEN|THEN|AND)[ \\t]*\\r?$")
        let matches = re.matches(in: source, range: NSRange(location: 0, length: ns.length))
        return matches.enumerated().map { index, match in
            var start = NSMaxRange(match.range)
            if start < ns.length, ns.substring(with: NSRange(location: start, length: 1)) == "\r" { start += 1 }
            if start < ns.length, ns.substring(with: NSRange(location: start, length: 1)) == "\n" { start += 1 }
            let end = index + 1 < matches.count ? matches[index + 1].range.location : ns.length
            let range = NSRange(location: start, length: end - start)
            return Block(id: index, kind: ns.substring(with: match.range(at: 1)).uppercased(),
                         body: ns.substring(with: range).trimmingCharacters(in: .newlines), range: range)
        }
    }
    var valid: Bool { ["GIVEN", "WHEN", "THEN"].allSatisfy { kind in blocks.contains { $0.kind == kind && !$0.body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } } }
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
        .init(intent: name, version: "1.0", steps: blocks.enumerated().map { i, block in
            .init(id: "step_\(i + 1)", type: block.kind,
                  text: block.body.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }.joined(separator: " "), entities: [])
        }, entities: [], valid: valid)
    }
}
